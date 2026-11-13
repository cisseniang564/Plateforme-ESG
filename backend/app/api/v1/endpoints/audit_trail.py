"""
Audit Trail API — paginated, filterable log of all ESG data changes.
Required for CSRD compliance and external audits.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from sqlalchemy import Text, cast, func, or_, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_tenant_id
from app.models.audit_log import AuditLog
from app.core.permissions import require_role, Roles
from app.dependencies import get_current_user
from app.models.user import User
from app.services.audit_service import log_change

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audit-trail", tags=["Audit Trail"])


# ─── helpers ──────────────────────────────────────────────────────────────────

_ENTITY_MODULE_MAP: Dict[str, str] = {
    "data_entries":         "Collecte Données",
    "indicators":           "Pilotage ESG",
    "indicator_data":       "Collecte Données",
    "esg_scores":           "Scoring ESG",
    "organizations":        "Organisations",
    "reports":              "Rapports",
    "materiality_issues":   "Matérialité",
    "materiality_risks":    "Risques",
    "users":                "Gestion Utilisateurs",
    "import":               "Import Données",
    "validation_workflow":  "Validation",
    "calculation":          "Calculs Auto",
    "taxonomy":             "Taxonomie UE",
    "compliance":           "Conformité",
    "supply_chain":         "Supply Chain",
}

_ACTION_MAP: Dict[str, str] = {
    "create":           "CREATE",
    "update":           "UPDATE",
    "delete":           "DELETE",
    "validate":         "APPROVE",
    "approve":          "APPROVE",
    "reject":           "REJECT",
    "submit":           "SUBMIT",
    "import":           "IMPORT",
    "bulk_import":      "IMPORT",
    "csv_import":       "IMPORT",
    "reset_esg_data":   "DELETE",
    "delete_tenant":    "DELETE",
    "export":           "EXPORT",
    "login":            "LOGIN",
    "logout":           "LOGIN",
    "comment":          "COMMENT",
    "attach":           "ATTACH",
    "calculate":        "CALCULATE",
    "recalculate":      "CALCULATE",
    "publish":          "PUBLISH",
}


def _serialize_event(log: AuditLog) -> Dict[str, Any]:
    """Convert an AuditLog DB row to the frontend event shape."""
    action_raw = (log.action or "").lower()
    action = _ACTION_MAP.get(action_raw, log.action.upper() if log.action else "UPDATE")

    entity_type = log.entity_type or "record"
    module = _ENTITY_MODULE_MAP.get(entity_type, entity_type.replace("_", " ").title())
    entity_label = entity_type.replace("_", " ").title().rstrip("s")  # strip plural

    # Build old/new value summaries
    old_val: Optional[str] = None
    new_val: Optional[str] = None
    if log.old_values:
        parts = [f"{k}: {v}" for k, v in log.old_values.items() if k not in ("id", "tenant_id")]
        old_val = " | ".join(parts[:3]) if parts else None
    if log.new_values:
        parts = [f"{k}: {v}" for k, v in log.new_values.items() if k not in ("id", "tenant_id")]
        new_val = " | ".join(parts[:3]) if parts else None

    # Description from change_reason or generated
    description = log.change_reason
    if not description:
        if old_val and new_val:
            description = f"Modification de {entity_label}"
        elif new_val:
            description = f"Création de {entity_label}"
        elif action == "DELETE":
            description = f"Suppression de {entity_label}"
        else:
            description = f"Action {action.lower()} sur {entity_label}"

    meta = log.entry_metadata or {}

    # ── Signature hash (SHA-256 e-signature from approve/verify actions) ──
    # We persist signatures in new_values["signature_hash"]; surface them on
    # the audit event so the UI can render a "signed" badge with the proof.
    sig_hash = None
    if isinstance(log.new_values, dict):
        sig_hash = log.new_values.get("signature_hash")

    return {
        "id": str(log.id),
        "timestamp": log.created_at.isoformat() if log.created_at else None,
        "user": log.user_email or "Système",
        "userRole": meta.get("user_role", "—"),
        "action": action,
        "module": module,
        "entity": entity_label,
        "entityId": str(log.entity_id) if log.entity_id else "—",
        "description": description,
        "oldValue": old_val,
        "newValue": new_val,
        "ipAddress": log.ip_address,
        "sessionId": meta.get("session_id"),
        # Integrity hash (if computed) OR the e-signature hash (preferred).
        # `entryHash` is the SHA-256 chain hash sealed at write time.
        "hash": log.entry_hash or sig_hash or meta.get("integrity_hash"),
        "entryHash": log.entry_hash,
        "previousHash": log.previous_hash,
        "signatureHash": sig_hash,  # Explicit field for "signed" badge logic.
        "attachments": meta.get("attachments", []),
        "comment": log.change_reason if action == "COMMENT" else None,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

def _apply_filters(stmt, *, action, entity_type, user_email, date_from, date_to, search):
    """Filtres communs à la liste et à l'export (une seule définition)."""
    if action:
        stmt = stmt.where(AuditLog.action.ilike(action))
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if user_email:
        stmt = stmt.where(AuditLog.user_email.ilike(f"%{user_email}%"))
    for raw, op in ((date_from, "ge"), (date_to, "le")):
        if not raw:
            continue
        try:
            dt = datetime.fromisoformat(raw)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Date invalide : {raw}")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        stmt = stmt.where(AuditLog.created_at >= dt if op == "ge" else AuditLog.created_at <= dt)
    if search and search.strip():
        like = f"%{search.strip()}%"
        stmt = stmt.where(or_(
            AuditLog.entity_type.ilike(like),
            AuditLog.user_email.ilike(like),
            AuditLog.change_reason.ilike(like),
            cast(AuditLog.old_values, Text).ilike(like),
            cast(AuditLog.new_values, Text).ilike(like),
        ))
    return stmt


@router.get("", summary="Liste paginée de la piste d'audit")
async def list_audit_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: Optional[str] = Query(None, description="Filtrer par action (create, update, delete…)"),
    entity_type: Optional[str] = Query(None, description="Filtrer par type d'entité"),
    user_email: Optional[str] = Query(None, description="Filtrer par utilisateur"),
    date_from: Optional[str] = Query(None, description="Date de début ISO 8601"),
    date_to: Optional[str] = Query(None, description="Date de fin ISO 8601"),
    search: Optional[str] = Query(None, description="Recherche libre dans les valeurs"),
    _: None = Depends(require_role(*Roles.ADMIN_OR_ABOVE)),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Piste d'audit paginée et filtrée (esg_admin / tenant_admin uniquement)."""
    stmt = _apply_filters(
        select(AuditLog).where(AuditLog.tenant_id == tenant_id),
        action=action, entity_type=entity_type, user_email=user_email,
        date_from=date_from, date_to=date_to, search=search,
    )

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Fetch page
    offset = (page - 1) * page_size
    stmt = stmt.order_by(desc(AuditLog.created_at)).offset(offset).limit(page_size)
    result = await db.execute(stmt)
    logs = result.scalars().all()

    return {
        "items": [_serialize_event(log) for log in logs],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, -(-total // page_size)),  # ceil division
    }


@router.get("/stats", summary="Statistiques de la piste d'audit")
async def audit_stats(
    days: int = Query(30, ge=1, le=365),
    _: None = Depends(require_role(*Roles.ADMIN_OR_ABOVE)),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Return audit event counts grouped by action type for the last N days."""
    from datetime import timedelta

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    stmt = (
        select(AuditLog.action, func.count().label("count"))
        .where(AuditLog.tenant_id == tenant_id, AuditLog.created_at >= cutoff)
        .group_by(AuditLog.action)
    )
    result = await db.execute(stmt)
    rows = result.all()

    by_action = {r.action: r.count for r in rows}
    total = sum(by_action.values())

    # Recent activity (last 7 days)
    recent_stmt = (
        select(func.count())
        .select_from(AuditLog)
        .where(
            AuditLog.tenant_id == tenant_id,
            AuditLog.created_at >= datetime.now(timezone.utc) - timedelta(days=7),
        )
    )
    recent_result = await db.execute(recent_stmt)
    recent = recent_result.scalar() or 0

    return {
        "total": total,
        "recent_7_days": recent,
        "by_action": by_action,
        "period_days": days,
    }


# ─── Hash chain verification ─────────────────────────────────────────────────


@router.get("/verify", summary="Vérifier l'intégrité de la chaîne d'audit (SHA-256)")
async def verify_audit_chain(
    limit: Optional[int] = Query(
        None,
        ge=1,
        le=10000,
        description=(
            "Vérifier uniquement les N entrées les plus récentes. "
            "Si non renseigné, vérifie toute la chaîne du tenant."
        ),
    ),
    _: None = Depends(require_role(*Roles.ADMIN_OR_ABOVE)),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Vérifie l'intégrité de la chaîne d'audit SHA-256 du tenant.

    Pour chaque entrée :
      1. Recalcule SHA-256(contenu canonique + previous_hash) ;
      2. Compare au `entry_hash` stocké ;
      3. Vérifie que `previous_hash` correspond au hash de l'entrée précédente.

    Toute incohérence indique une modification ou une insertion non-autorisée
    d'une entrée passée. Le rapport indique la première rupture détectée.

    Réservé aux rôles `esg_admin` et `tenant_admin`.
    """
    from app.services.audit_chain_service import verify_chain

    report = await verify_chain(db, tenant_id, limit=limit)
    return report


@router.post(
    "/backfill",
    summary="Calculer rétroactivement les hashs manquants (one-shot)",
)
async def backfill_audit_chain(
    _: None = Depends(require_role(*Roles.ADMIN_OR_ABOVE)),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Calcule et persiste `entry_hash` + `previous_hash` pour toutes les entrées
    historiques du tenant qui n'en ont pas encore (legacy avant le rollout).

    Idempotent — les entrées déjà scellées sont préservées et utilisées comme
    ancres pour la suite de la chaîne. Réservé aux administrateurs tenant.
    """
    from app.services.audit_chain_service import backfill_chain

    processed, skipped = await backfill_chain(db, tenant_id)
    await db.commit()

    return {
        "tenant_id": str(tenant_id),
        "processed": processed,
        "skipped": skipped,
        "message": (
            f"{processed} entrée(s) scellée(s), {skipped} déjà à jour."
            if processed
            else "Toutes les entrées sont déjà scellées."
        ),
    }


# ─── Export ──────────────────────────────────────────────────────────────────

_EXPORT_MAX_ROWS = 50_000
_CSV_COLUMNS = [
    "created_at", "user_email", "action", "entity_type", "entity_id",
    "change_reason", "old_values", "new_values", "ip_address",
    "entry_hash", "previous_hash",
]


def _csv_cell(value: Any) -> str:
    """Neutralise l'injection de formules (=, +, -, @) à l'ouverture dans Excel."""
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)
    text_value = str(value)
    if text_value[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text_value
    return text_value


@router.get("/export", summary="Exporter la piste d'audit (CSV ou JSON)")
async def export_audit_trail(
    request: Request,
    format: str = Query("csv", pattern="^(csv|json)$"),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    user_email: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    _: None = Depends(require_role(*Roles.ADMIN_OR_ABOVE)),
    current_user: User = Depends(get_current_user),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export réel des entrées filtrées, avec les empreintes de chaîne.

    L'export est lui-même tracé dans le journal. Il contient les `entry_hash` /
    `previous_hash` permettant à un tiers de recalculer la chaîne ; il ne
    constitue pas une attestation (celle-ci relève de l'auditeur).
    """
    stmt = _apply_filters(
        select(AuditLog).where(AuditLog.tenant_id == tenant_id),
        action=action, entity_type=entity_type, user_email=user_email,
        date_from=date_from, date_to=date_to, search=search,
    ).order_by(AuditLog.created_at.asc(), AuditLog.id.asc()).limit(_EXPORT_MAX_ROWS + 1)
    logs = list((await db.execute(stmt)).scalars().all())
    truncated = len(logs) > _EXPORT_MAX_ROWS
    logs = logs[:_EXPORT_MAX_ROWS]

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    if format == "json":
        payload = {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "count": len(logs),
            "truncated": truncated,
            "entries": [
                {
                    "id": str(l.id),
                    "created_at": l.created_at.isoformat() if l.created_at else None,
                    "user_email": l.user_email,
                    "action": l.action,
                    "entity_type": l.entity_type,
                    "entity_id": str(l.entity_id) if l.entity_id else None,
                    "change_reason": l.change_reason,
                    "old_values": l.old_values,
                    "new_values": l.new_values,
                    "ip_address": l.ip_address,
                    "entry_hash": l.entry_hash,
                    "previous_hash": l.previous_hash,
                }
                for l in logs
            ],
        }
        body = json.dumps(payload, ensure_ascii=False, indent=2, default=str)
        media = "application/json"
    else:
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(_CSV_COLUMNS)
        for l in logs:
            writer.writerow([
                _csv_cell(l.created_at.isoformat() if l.created_at else None),
                _csv_cell(l.user_email), _csv_cell(l.action), _csv_cell(l.entity_type),
                _csv_cell(l.entity_id), _csv_cell(l.change_reason),
                _csv_cell(l.old_values), _csv_cell(l.new_values), _csv_cell(l.ip_address),
                _csv_cell(l.entry_hash), _csv_cell(l.previous_hash),
            ])
        body = "\ufeff" + buf.getvalue()  # BOM : accents corrects dans Excel
        media = "text/csv; charset=utf-8"

    await log_change(
        db, tenant_id=tenant_id, entity_type="audit_export", entity_id=current_user.id,
        action="export", user=current_user,
        new_values={"format": format, "rows": len(logs), "truncated": truncated},
        ip_address=request.client.host if request.client else None,
    )
    return Response(
        content=body,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="piste-audit-{stamp}.{format}"'},
    )

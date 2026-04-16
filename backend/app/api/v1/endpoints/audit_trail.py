"""
Audit Trail API — paginated, filterable log of all ESG data changes.
Required for CSRD compliance and external audits.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_tenant_id
from app.models.audit_log import AuditLog
from app.core.permissions import require_role, Roles

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
    "create":   "CREATE",
    "update":   "UPDATE",
    "delete":   "DELETE",
    "validate": "APPROVE",
    "reject":   "REJECT",
    "submit":   "SUBMIT",
    "import":   "IMPORT",
    "export":   "EXPORT",
    "login":    "LOGIN",
    "comment":  "COMMENT",
    "attach":   "ATTACH",
    "calculate":"CALCULATE",
    "publish":  "PUBLISH",
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
        "hash": meta.get("integrity_hash"),
        "attachments": meta.get("attachments", []),
        "comment": log.change_reason if action == "COMMENT" else None,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

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
    from datetime import datetime

    stmt = select(AuditLog).where(AuditLog.tenant_id == tenant_id)

    if action:
        stmt = stmt.where(AuditLog.action.ilike(action))
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if user_email:
        stmt = stmt.where(AuditLog.user_email.ilike(f"%{user_email}%"))
    if date_from:
        try:
            stmt = stmt.where(AuditLog.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            stmt = stmt.where(AuditLog.created_at <= datetime.fromisoformat(date_to))
        except ValueError:
            pass

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
    from datetime import datetime, timedelta, timezone

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

"""Validation workflow endpoints - Data quality review process."""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.permissions import Roles
from app.dependencies import get_db, get_current_user, require_any_role
from app.models.user import User
from app.models.indicator import Indicator
from app.models.indicator_data import IndicatorData
from app.models.audit_log import AuditLog
from app.services.audit_chain_service import seal_entry

router = APIRouter(prefix="/validation", tags=["Validation Workflow"])


class BulkActionRequest(BaseModel):
    entry_ids: List[UUID]
    notes: Optional[str] = None
    assigned_to_user_id: Optional[UUID] = None


async def _write_audit_logs(
    db: AsyncSession,
    entries: list,
    action: str,
    user: User,
    notes: Optional[str],
    old_status: str,
    new_status: str,
    ip_address: Optional[str] = None,
):
    """Insert one AuditLog row per affected IndicatorData entry (scellée dans la chaîne SHA-256)."""
    now = datetime.now(timezone.utc)
    for entry in entries:
        log = AuditLog(
            id=uuid4(),
            tenant_id=user.tenant_id,
            entity_type="indicator_data",
            entity_id=entry.id,
            action=action,
            user_id=user.id,
            user_email=user.email,
            old_values={"validation_status": old_status},
            new_values={"validation_status": new_status},
            change_reason=notes,
            ip_address=ip_address,
            entry_metadata={
                "indicator_id": str(entry.indicator_id),
                "value": entry.value,
                "date": str(entry.date),
            },
        )
        db.add(log)
        await db.flush()
        try:
            await seal_entry(db, log)
        except Exception:  # ne jamais bloquer la validation pour un problème de scellement
            pass


def _ip(request: Request) -> Optional[str]:
    return request.client.host if request.client else None


async def _entry_rows(db: AsyncSession, entries: list, current_user: User) -> list[dict]:
    """Enrichit les saisies : nom de l'indicateur, unité, auteur de la soumission, droit d'approuver."""
    if not entries:
        return []
    ind_ids = {e.indicator_id for e in entries}
    inds = {i.id: i for i in (await db.execute(select(Indicator).where(Indicator.id.in_(ind_ids)))).scalars().all()}
    user_ids = {e.submitted_by for e in entries if e.submitted_by}
    users = {}
    if user_ids:
        rows = (await db.execute(select(User.id, User.email, User.full_name).where(User.id.in_(user_ids)))).all()
        users = {r.id: (r.full_name or r.email) for r in rows}
    out = []
    for e in entries:
        ind = inds.get(e.indicator_id)
        out.append({
            "id": str(e.id),
            "indicator_id": str(e.indicator_id),
            "indicator_code": getattr(ind, "code", None),
            "indicator_name": getattr(ind, "name", None),
            "unit": getattr(ind, "unit", None),
            "date": str(e.date),
            "value": e.value,
            "validation_status": e.validation_status or "draft",
            "submitted_at": e.submitted_at.isoformat() if e.submitted_at else None,
            "submitted_by": str(e.submitted_by) if e.submitted_by else None,
            "submitted_by_name": users.get(e.submitted_by),
            "reviewer_notes": e.reviewer_notes if (e.validation_status or "draft") == "draft" else None,
            # Principe des 4 yeux : on n'approuve pas ses propres soumissions
            "can_approve": e.submitted_by != current_user.id,
        })
    return out


@router.post("/submit-for-review")
async def submit_for_review(
    request: Request,
    body: BulkActionRequest,
    current_user: User = Depends(require_any_role(*Roles.ENTRY_OR_ABOVE)),
    db: AsyncSession = Depends(get_db),
):
    """Move draft entries to pending_review."""
    from sqlalchemy import or_
    if body.assigned_to_user_id:
        if body.assigned_to_user_id == current_user.id:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous assigner votre propre validation.")
        assignee = (await db.execute(select(User).where(
            User.id == body.assigned_to_user_id, User.tenant_id == current_user.tenant_id, User.is_active.is_(True),
        ))).scalar_one_or_none()
        if not assignee:
            raise HTTPException(status_code=400, detail="Validateur introuvable ou inactif.")
    result = await db.execute(
        select(IndicatorData).where(
            and_(
                IndicatorData.tenant_id == current_user.tenant_id,
                IndicatorData.id.in_(body.entry_ids),
                # Accept both explicit "draft" AND null (legacy entries without status)
                or_(
                    IndicatorData.validation_status == "draft",
                    IndicatorData.validation_status.is_(None),
                ),
            )
        )
    )
    entries = result.scalars().all()
    for entry in entries:
        entry.validation_status = "pending_review"
        entry.submitted_by = current_user.id
        entry.submitted_at = datetime.now(timezone.utc)
        entry.reviewed_by = body.assigned_to_user_id  # None si non assignée (efface un ancien refus)

    await _write_audit_logs(
        db, entries,
        action="submit",
        user=current_user,
        notes=body.notes,
        old_status="draft",
        new_status="pending_review",
        ip_address=_ip(request),
    )
    await db.commit()
    return {"updated": len(entries)}


@router.post("/approve")
async def approve_entries(
    request: Request,
    body: BulkActionRequest,
    current_user: User = Depends(require_any_role(*Roles.MANAGER_OR_ABOVE)),
    db: AsyncSession = Depends(get_db),
):
    """Approve pending entries.

    Principe des 4 yeux : l'auteur d'une soumission ne peut pas l'approuver.
    Chaque approbation enregistre une empreinte SHA-256 (tenant, saisie, valeur,
    approbateur, horodatage) dans les notes de revue : c'est un repère de
    traçabilité recalculable, pas une signature électronique qualifiée (eIDAS).
    """
    import hashlib

    result = await db.execute(
        select(IndicatorData).where(
            and_(
                IndicatorData.tenant_id == current_user.tenant_id,
                IndicatorData.id.in_(body.entry_ids),
                IndicatorData.validation_status == "pending_review",
            )
        )
    )
    entries = result.scalars().all()

    # ── Separation of duties (4-eyes) ────────────────────────────────────
    # Drop entries where the current user was the submitter. We don't fail
    # the whole batch — we just skip those and report the count back so
    # the UI can surface the conflict to the user.
    skipped_sod: list[str] = []
    approvable = []
    for e in entries:
        if e.submitted_by is not None and e.submitted_by == current_user.id:
            skipped_sod.append(str(e.id))
        else:
            approvable.append(e)

    now = datetime.now(timezone.utc)
    client_ip = request.client.host if request.client else None

    for entry in approvable:
        # Empreinte SHA-256 de (tenant + saisie + valeur + approbateur + horodatage),
        # conservée dans reviewer_notes pour la traçabilité.
        sig_payload = (
            f"{entry.tenant_id}|{entry.id}|{entry.indicator_id}|"
            f"{entry.value}|{entry.date}|{current_user.id}|{now.isoformat()}"
        )
        signature = hashlib.sha256(sig_payload.encode("utf-8")).hexdigest()

        entry.validation_status = "approved"
        entry.reviewed_by = current_user.id
        entry.reviewed_at = now
        # Embed signature in reviewer_notes (preserves user note + adds proof).
        sig_block = (
            f"\n\n[Empreinte d'approbation SHA-256]\n"
            f"  Hash:       {signature}\n"
            f"  Approuvé par: {current_user.email}\n"
            f"  Date:       {now.isoformat()}\n"
            f"  IP:         {client_ip or 'n/a'}"
        )
        user_notes = (body.notes or "").strip()
        entry.reviewer_notes = (user_notes + sig_block) if user_notes else sig_block.strip()
        entry.is_verified = True

    await _write_audit_logs(
        db, approvable,
        action="validate",
        user=current_user,
        notes=body.notes,
        old_status="pending_review",
        new_status="approved",
        ip_address=client_ip,
    )
    await db.commit()
    return {
        "approved": len(approvable),
        "skipped_self_approval": len(skipped_sod),
        "skipped_ids": skipped_sod,
        "message": (
            f"{len(approvable)} entrée(s) approuvée(s)."
            + (f" {len(skipped_sod)} ignorée(s) — vous ne pouvez pas approuver vos propres saisies."
               if skipped_sod else "")
        ),
    }


@router.post("/reject")
async def reject_entries(
    request: Request,
    body: BulkActionRequest,
    current_user: User = Depends(require_any_role(*Roles.MANAGER_OR_ABOVE)),
    db: AsyncSession = Depends(get_db),
):
    """Refuse des saisies en attente : retour en brouillon, avec un motif obligatoire."""
    if len((body.notes or "").strip()) < 3:
        raise HTTPException(status_code=422, detail="Indiquez le motif du refus pour que l'auteur puisse corriger.")
    result = await db.execute(
        select(IndicatorData).where(
            and_(
                IndicatorData.tenant_id == current_user.tenant_id,
                IndicatorData.id.in_(body.entry_ids),
                IndicatorData.validation_status == "pending_review",
            )
        )
    )
    entries = result.scalars().all()
    for entry in entries:
        entry.validation_status = "draft"
        entry.reviewed_by = current_user.id
        entry.reviewed_at = datetime.now(timezone.utc)
        entry.reviewer_notes = body.notes.strip()

    await _write_audit_logs(
        db, entries,
        action="reject",
        user=current_user,
        notes=body.notes,
        old_status="pending_review",
        new_status="draft",
        ip_address=_ip(request),
    )
    await db.commit()
    return {"rejected": len(entries)}


@router.get("/drafts")
async def list_drafts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Brouillons à soumettre (statut « draft » ou absent pour les anciennes saisies)."""
    from sqlalchemy import or_
    result = await db.execute(
        select(IndicatorData).where(
            and_(
                IndicatorData.tenant_id == current_user.tenant_id,
                or_(IndicatorData.validation_status == "draft", IndicatorData.validation_status.is_(None)),
            )
        ).order_by(IndicatorData.date.desc()).limit(200)
    )
    return await _entry_rows(db, result.scalars().all(), current_user)


@router.get("/pending")
async def list_pending(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Saisies soumises, en attente de validation."""
    result = await db.execute(
        select(IndicatorData).where(
            and_(
                IndicatorData.tenant_id == current_user.tenant_id,
                IndicatorData.validation_status == "pending_review",
            )
        ).order_by(IndicatorData.submitted_at.desc()).limit(200)
    )
    return await _entry_rows(db, result.scalars().all(), current_user)


@router.get("/my-queue")
async def my_queue(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Saisies qui m'ont été assignées pour validation."""
    result = await db.execute(
        select(IndicatorData).where(
            and_(
                IndicatorData.tenant_id == current_user.tenant_id,
                IndicatorData.validation_status == "pending_review",
                IndicatorData.reviewed_by == current_user.id,
            )
        ).order_by(IndicatorData.submitted_at.desc()).limit(200)
    )
    return await _entry_rows(db, result.scalars().all(), current_user)


@router.get("/team-members")
async def list_team_members(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Validateurs possibles : utilisateurs actifs de l'espace, hors soi-même."""
    result = await db.execute(
        select(User.id, User.email, User.full_name).where(
            User.tenant_id == current_user.tenant_id,
            User.is_active.is_(True),
            User.id != current_user.id,
        ).order_by(User.email).limit(100)
    )
    return [{"id": str(r.id), "email": r.email, "full_name": r.full_name, "name": r.full_name or r.email}
            for r in result.all()]


@router.get("/stats")
async def validation_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Nombre de saisies par statut (une saisie sans statut compte comme brouillon)."""
    result = await db.execute(
        select(IndicatorData.validation_status, func.count().label("count"))
        .where(IndicatorData.tenant_id == current_user.tenant_id)
        .group_by(IndicatorData.validation_status)
    )
    out = {"draft": 0, "pending_review": 0, "approved": 0}
    for row in result.all():
        key = row.validation_status or "draft"
        out[key] = out.get(key, 0) + row.count
    return out

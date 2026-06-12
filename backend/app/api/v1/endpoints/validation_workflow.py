"""Validation workflow endpoints - Data quality review process."""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.indicator_data import IndicatorData
from app.models.audit_log import AuditLog

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
):
    """Insert one AuditLog row per affected IndicatorData entry."""
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
            entry_metadata={
                "indicator_id": str(entry.indicator_id),
                "value": entry.value,
                "date": str(entry.date),
            },
        )
        db.add(log)


@router.post("/submit-for-review")
async def submit_for_review(
    body: BulkActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Move draft entries to pending_review."""
    from sqlalchemy import or_
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
        if body.assigned_to_user_id:
            entry.reviewed_by = body.assigned_to_user_id

    await _write_audit_logs(
        db, entries,
        action="submit",
        user=current_user,
        notes=body.notes,
        old_status="draft",
        new_status="pending_review",
    )
    await db.commit()
    return {"updated": len(entries)}


@router.post("/approve")
async def approve_entries(
    request: Request,
    body: BulkActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve pending entries.

    Enforces SoD (separation of duties): the user who submitted an entry
    cannot approve their own entry — this is a hard CSRD / ISAE 3000
    requirement. Each approved entry gets a SHA-256 signature hash that
    cryptographically binds the approver, the data values, and the timestamp;
    re-computable later for legal proof.
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
        # ── E-signature: SHA-256 of (tenant + entry + value + approver + ts)
        # Stored verbatim on the reviewer_notes for legal traceability.
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
            f"\n\n[Signature électronique]\n"
            f"  Hash:       {signature}\n"
            f"  Signé par:  {current_user.email}\n"
            f"  Date:       {now.isoformat()}\n"
            f"  IP:         {client_ip or 'n/a'}\n"
            f"  Conformité: ISAE 3000 · CSRD Art. 29a"
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
    )
    await db.commit()
    return {
        "approved": len(approvable),
        "skipped_self_approval": len(skipped_sod),
        "skipped_ids": skipped_sod,
        "message": (
            f"{len(approvable)} entrée(s) approuvée(s) et signée(s)."
            + (f" {len(skipped_sod)} ignorée(s) — vous ne pouvez pas approuver vos propres saisies."
               if skipped_sod else "")
        ),
    }


@router.post("/reject")
async def reject_entries(
    body: BulkActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Reject pending entries back to draft."""
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
        entry.reviewer_notes = body.notes

    await _write_audit_logs(
        db, entries,
        action="reject",
        user=current_user,
        notes=body.notes,
        old_status="pending_review",
        new_status="draft",
    )
    await db.commit()
    return {"rejected": len(entries)}


@router.get("/pending")
async def list_pending(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List entries pending review."""
    result = await db.execute(
        select(IndicatorData).where(
            and_(
                IndicatorData.tenant_id == current_user.tenant_id,
                IndicatorData.validation_status == "pending_review",
            )
        ).limit(100)
    )
    entries = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "indicator_id": str(e.indicator_id),
            "date": str(e.date),
            "value": e.value,
            "validation_status": e.validation_status,
            "submitted_at": e.submitted_at.isoformat() if e.submitted_at else None,
        }
        for e in entries
    ]


@router.get("/my-queue")
async def my_queue(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Entries assigned to me for review (pending_review + reviewed_by == me)."""
    result = await db.execute(
        select(IndicatorData).where(
            and_(
                IndicatorData.tenant_id == current_user.tenant_id,
                IndicatorData.validation_status == "pending_review",
                IndicatorData.reviewed_by == current_user.id,
            )
        ).limit(200)
    )
    entries = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "indicator_id": str(e.indicator_id),
            "date": str(e.date),
            "value": e.value,
            "validation_status": e.validation_status,
            "submitted_at": e.submitted_at.isoformat() if e.submitted_at else None,
            "submitted_by": str(e.submitted_by) if e.submitted_by else None,
        }
        for e in entries
    ]


@router.get("/team-members")
async def list_team_members(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.user import User as UserModel
    result = await db.execute(
        select(UserModel.id, UserModel.email, UserModel.full_name).where(
            UserModel.tenant_id == current_user.tenant_id
        ).limit(50)
    )
    rows = result.all()
    return [{"id": str(r.id), "email": r.email, "name": r.full_name or r.email} for r in rows]


@router.get("/stats")
async def validation_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Count entries by validation status."""
    result = await db.execute(
        select(IndicatorData.validation_status, func.count().label("count"))
        .where(IndicatorData.tenant_id == current_user.tenant_id)
        .group_by(IndicatorData.validation_status)
    )
    rows = result.all()
    return {row.validation_status: row.count for row in rows}

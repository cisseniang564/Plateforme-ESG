"""Validation workflow endpoints - Data quality review process."""
from fastapi import APIRouter, Depends, HTTPException
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
    body: BulkActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Approve pending entries."""
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
        entry.validation_status = "approved"
        entry.reviewed_by = current_user.id
        entry.reviewed_at = datetime.now(timezone.utc)
        entry.reviewer_notes = body.notes

    await _write_audit_logs(
        db, entries,
        action="validate",
        user=current_user,
        notes=body.notes,
        old_status="pending_review",
        new_status="approved",
    )
    await db.commit()
    return {"approved": len(entries)}


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

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, extract
from typing import List, Optional
from datetime import date, datetime, timedelta
from uuid import UUID
from pydantic import BaseModel

from app.dependencies import get_db, get_current_user
from app.models.data_entry import DataEntry
from app.models.audit_log import AuditLog
from app.models.user import User
from app.services.audit_service import log_change

router = APIRouter()

# ============= SCHEMAS =============

class ValidationAction(BaseModel):
    action: str  # verify, reject, flag
    reason: Optional[str] = None

class DataQualityStats(BaseModel):
    total_entries: int
    pending: int
    verified: int
    rejected: int
    flagged: int
    completeness_score: float
    avg_quality_score: float
    entries_with_source: int
    entries_with_attachments: int
    stale_entries: int  # >90 days old

class QualityIssue(BaseModel):
    id: UUID
    metric_name: str
    issue_type: str
    severity: str
    details: str
    created_at: datetime

# ============= VALIDATION ENDPOINTS =============

@router.post("/entries/{entry_id}/validate")
async def validate_entry(
    entry_id: UUID,
    validation: ValidationAction,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Validate, reject, or flag a data entry"""
    
    # Get entry
    result = await db.execute(
        select(DataEntry).where(
            DataEntry.id == entry_id,
            DataEntry.tenant_id == current_user.tenant_id
        )
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Store old values for audit
    old_status = entry.verification_status
    
    # Update status
    if validation.action == "verify":
        entry.verification_status = "verified"
        entry.verified_by = current_user.id
        entry.verified_at = datetime.utcnow()
    elif validation.action == "reject":
        entry.verification_status = "rejected"
        entry.verified_by = current_user.id
        entry.verified_at = datetime.utcnow()
    elif validation.action == "flag":
        entry.verification_status = "flagged"
        if not entry.quality_flags:
            entry.quality_flags = {}
        entry.quality_flags["manual_flag"] = {
            "flagged_by": str(current_user.id),
            "reason": validation.reason,
            "flagged_at": datetime.utcnow().isoformat()
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    await db.commit()
    await db.refresh(entry)
    
    # Log the validation action
    await log_change(
        db=db,
        tenant_id=current_user.tenant_id,
        entity_type="data_entries",
        entity_id=entry.id,
        action=validation.action,
        user=current_user,
        old_values={"verification_status": old_status},
        new_values={"verification_status": entry.verification_status},
        change_reason=validation.reason,
        ip_address=request.client.host if request.client else None
    )
    
    return {
        "message": f"Entry {validation.action}d successfully",
        "entry_id": entry.id,
        "new_status": entry.verification_status
    }

@router.get("/quality/stats", response_model=DataQualityStats)
async def get_quality_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get overall data quality statistics"""
    
    # Total entries
    total_result = await db.execute(
        select(func.count(DataEntry.id)).where(
            DataEntry.tenant_id == current_user.tenant_id
        )
    )
    total = total_result.scalar() or 0
    
    if total == 0:
        return DataQualityStats(
            total_entries=0,
            pending=0,
            verified=0,
            rejected=0,
            flagged=0,
            completeness_score=0,
            avg_quality_score=0,
            entries_with_source=0,
            entries_with_attachments=0,
            stale_entries=0
        )
    
    # Count by status
    status_result = await db.execute(
        select(
            DataEntry.verification_status,
            func.count(DataEntry.id)
        ).where(
            DataEntry.tenant_id == current_user.tenant_id
        ).group_by(DataEntry.verification_status)
    )
    status_counts = {row[0]: row[1] for row in status_result}
    
    # Entries with source
    source_result = await db.execute(
        select(func.count(DataEntry.id)).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.data_source.isnot(None),
            DataEntry.data_source != ''
        )
    )
    with_source = source_result.scalar() or 0
    
    # Entries with attachments
    attachments_result = await db.execute(
        select(func.count(DataEntry.id)).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.attachments.isnot(None)
        )
    )
    with_attachments = attachments_result.scalar() or 0
    
    # Stale entries (>90 days old)
    stale_date = datetime.utcnow() - timedelta(days=90)
    stale_result = await db.execute(
        select(func.count(DataEntry.id)).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.created_at < stale_date,
            DataEntry.verification_status == 'pending'
        )
    )
    stale = stale_result.scalar() or 0
    
    # Average quality score
    quality_result = await db.execute(
        select(func.avg(DataEntry.quality_score)).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.quality_score.isnot(None)
        )
    )
    avg_quality = quality_result.scalar() or 0
    
    # Completeness score (% with source)
    completeness = (with_source / total * 100) if total > 0 else 0
    
    return DataQualityStats(
        total_entries=total,
        pending=status_counts.get('pending', 0),
        verified=status_counts.get('verified', 0),
        rejected=status_counts.get('rejected', 0),
        flagged=status_counts.get('flagged', 0),
        completeness_score=round(completeness, 2),
        avg_quality_score=round(float(avg_quality), 2),
        entries_with_source=with_source,
        entries_with_attachments=with_attachments,
        stale_entries=stale
    )

@router.get("/quality/issues", response_model=List[QualityIssue])
async def get_quality_issues(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of data quality issues requiring attention"""
    
    issues = []
    
    # Missing sources
    missing_source = await db.execute(
        select(DataEntry).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.verification_status == 'pending',
            or_(
                DataEntry.data_source.is_(None),
                DataEntry.data_source == ''
            )
        ).limit(20)
    )
    
    for entry in missing_source.scalars():
        issues.append(QualityIssue(
            id=entry.id,
            metric_name=entry.metric_name,
            issue_type="missing_source",
            severity="medium",
            details=f"No data source specified for {entry.metric_name}",
            created_at=entry.created_at
        ))
    
    # Stale entries
    stale_date = datetime.utcnow() - timedelta(days=90)
    stale_entries = await db.execute(
        select(DataEntry).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.verification_status == 'pending',
            DataEntry.created_at < stale_date
        ).limit(20)
    )
    
    for entry in stale_entries.scalars():
        days_old = (datetime.utcnow() - entry.created_at).days
        issues.append(QualityIssue(
            id=entry.id,
            metric_name=entry.metric_name,
            issue_type="stale",
            severity="high" if days_old > 180 else "medium",
            details=f"Pending validation for {days_old} days",
            created_at=entry.created_at
        ))
    
    # Flagged entries
    flagged = await db.execute(
        select(DataEntry).where(
            DataEntry.tenant_id == current_user.tenant_id,
            DataEntry.verification_status == 'flagged'
        ).limit(20)
    )
    
    for entry in flagged.scalars():
        issues.append(QualityIssue(
            id=entry.id,
            metric_name=entry.metric_name,
            issue_type="flagged",
            severity="high",
            details=f"Flagged for review: {entry.quality_flags.get('manual_flag', {}).get('reason', 'No reason')}",
            created_at=entry.created_at
        ))
    
    return issues

@router.get("/entries/{entry_id}/history")
async def get_entry_history(
    entry_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get complete audit history for a data entry"""
    
    # Verify entry exists and belongs to tenant
    result = await db.execute(
        select(DataEntry).where(
            DataEntry.id == entry_id,
            DataEntry.tenant_id == current_user.tenant_id
        )
    )
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    
    # Get audit logs
    logs_result = await db.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "data_entries",
            AuditLog.entity_id == entry_id,
            AuditLog.tenant_id == current_user.tenant_id
        ).order_by(AuditLog.created_at.desc())
    )
    
    logs = logs_result.scalars().all()
    
    return {
        "entry_id": entry_id,
        "metric_name": entry.metric_name,
        "current_status": entry.verification_status,
        "history": [
            {
                "id": log.id,
                "action": log.action,
                "user_email": log.user_email,
                "timestamp": log.created_at,
                "old_values": log.old_values,
                "new_values": log.new_values,
                "reason": log.change_reason
            }
            for log in logs
        ]
    }

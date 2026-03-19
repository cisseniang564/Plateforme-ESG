"""
Audit Service - Log all ESG data changes
"""
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User


async def log_change(
    db: AsyncSession,
    tenant_id: UUID,
    entity_type: str,
    entity_id: UUID,
    action: str,
    user: Optional[User] = None,
    old_values: Optional[Dict[str, Any]] = None,
    new_values: Optional[Dict[str, Any]] = None,
    change_reason: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """
    Create an audit log entry.
    
    Args:
        entity_type: Table name (data_entries, materiality_issues, etc.)
        entity_id: ID of the record
        action: create, update, delete, validate, reject
        user: User who made the change
        old_values: Previous values (for updates)
        new_values: New values
        change_reason: User-provided reason
        ip_address: User's IP
    """
    
    audit_entry = AuditLog(
        tenant_id=tenant_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        user_id=user.id if user else None,
        user_email=user.email if user else None,
        old_values=old_values,
        new_values=new_values,
        change_reason=change_reason,
        ip_address=ip_address,
    )
    
    db.add(audit_entry)
    await db.commit()
    await db.refresh(audit_entry)
    
    return audit_entry


async def get_entity_history(
    db: AsyncSession,
    tenant_id: UUID,
    entity_type: str,
    entity_id: UUID,
) -> list[AuditLog]:
    """Get complete history for a specific entity"""
    from sqlalchemy import select
    
    query = select(AuditLog).where(
        AuditLog.tenant_id == tenant_id,
        AuditLog.entity_type == entity_type,
        AuditLog.entity_id == entity_id
    ).order_by(AuditLog.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()

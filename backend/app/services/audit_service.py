"""
Audit Service - Log all ESG data changes.

Every entry is automatically sealed into the per-tenant SHA-256 hash chain
(see audit_chain_service.seal_entry). The chain guarantees that any change
to a past entry is detectable via /audit-trail/verify.
"""
import logging
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User
from app.services.audit_chain_service import seal_entry

logger = logging.getLogger(__name__)


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
    Create an audit log entry — automatically sealed into the SHA-256 chain.

    Args:
        entity_type: Table name (data_entries, materiality_issues, etc.)
        entity_id: ID of the record
        action: create, update, delete, validate, reject
        user: User who made the change
        old_values: Previous values (for updates)
        new_values: New values
        change_reason: User-provided reason
        ip_address: User's IP

    Returns:
        The persisted AuditLog row, including `entry_hash` and `previous_hash`.
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
    # Flush so the entry gets its id + created_at — required for canonical hash.
    await db.flush()

    # Seal into the per-tenant SHA-256 chain. Wrapped in try/except so a hash
    # error never blocks the underlying audit log (we'd rather have an unsealed
    # entry than miss the audit altogether — the next entry's hash will be
    # computed against the previous SEALED hash, which is detectable).
    try:
        await seal_entry(db, audit_entry)
    except Exception as exc:
        logger.error(
            "Failed to seal audit entry %s into hash chain: %s",
            audit_entry.id, exc, exc_info=True,
        )

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

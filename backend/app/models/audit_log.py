"""
Audit Log model - Track all data changes for compliance
"""
from typing import TYPE_CHECKING, Optional
from datetime import datetime
from uuid import UUID
from sqlalchemy import String, Text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSON, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.user import User


class AuditLog(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    Comprehensive audit trail for all ESG data changes.
    Required for CSRD compliance and external audits.
    """
    __tablename__ = "audit_logs"

    # What changed
    entity_type: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True,
        comment="Table/entity name (data_entries, materiality_issues, etc.)"
    )
    entity_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), nullable=False, index=True,
        comment="ID of the changed record"
    )
    
    # Action
    action: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True,
        comment="Action: create, update, delete, validate, reject"
    )
    
    # Who
    user_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    user_email: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True,
        comment="Denormalized for audit persistence"
    )
    
    # Changes
    old_values: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Previous values before change"
    )
    new_values: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="New values after change"
    )
    
    # Context
    change_reason: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="User-provided reason for change"
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45), nullable=True,
        comment="IP address of user"
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Browser/client info"
    )
    
    # FIX: renamed from metadata to entry_metadata (metadata is reserved)
    entry_metadata: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Additional context (API endpoint, etc.)"
    )
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", foreign_keys="AuditLog.tenant_id", viewonly=True)
    user: Mapped[Optional["User"]] = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index('idx_audit_entity', 'entity_type', 'entity_id'),
        Index('idx_audit_created', 'created_at'),
    )

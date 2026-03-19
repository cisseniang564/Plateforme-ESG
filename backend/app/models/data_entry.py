"""
Data Entry model - MANUAL user input with full audit trail
"""
from typing import TYPE_CHECKING, Optional
from datetime import datetime
from uuid import UUID
from sqlalchemy import String, Float, Text, ForeignKey, Date
from sqlalchemy.dialects.postgresql import JSON, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.organization import Organization
    from app.models.user import User


class DataEntry(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    Manual ESG data entry with comprehensive audit trail.
    """
    __tablename__ = "data_entries"

    organization_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True
    )
    
    # Period
    period_start: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    period_end: Mapped[datetime] = mapped_column(Date, nullable=False)
    period_type: Mapped[str] = mapped_column(String(20), default="annual")
    
    # Categorization
    pillar: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    metric_name: Mapped[str] = mapped_column(String(200), nullable=False)
    
    # Value
    value_numeric: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    value_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # ============= AUDIT FIELDS =============
    
    # Source & Methodology
    data_source: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True,
        comment="Source of data (ERP, manual, file, API, etc.)"
    )
    collection_method: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True,
        comment="How data was collected (manual entry, API, upload, etc.)"
    )
    calculation_method: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Formula or methodology used to calculate this value"
    )
    
    # Validation & Quality
    verification_status: Mapped[str] = mapped_column(
        String(50), default="pending", index=True,
        comment="pending, verified, rejected, flagged"
    )
    verified_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    quality_score: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True,
        comment="Data quality score 0-100"
    )
    quality_flags: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Quality issues: outlier, missing_source, stale, etc."
    )
    
    # Ownership & Responsibility
    created_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    
    # Notes & Evidence
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attachments: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True,
        comment="Links to supporting documents, invoices, reports"
    )
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", foreign_keys="DataEntry.tenant_id", viewonly=True)
    organization: Mapped[Optional["Organization"]] = relationship("Organization", foreign_keys=[organization_id])
    creator: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by])
    verifier: Mapped[Optional["User"]] = relationship("User", foreign_keys=[verified_by])

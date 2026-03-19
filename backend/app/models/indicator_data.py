"""
Indicator Data model - ESG indicator values over time.
"""
from typing import TYPE_CHECKING, Optional
from uuid import UUID
from datetime import date, datetime

from sqlalchemy import String, Float, ForeignKey, Date, Text, Index
from sqlalchemy.dialects.postgresql import UUID as PGUUID, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.indicator import Indicator
    from app.models.organization import Organization
    from app.models.data_upload import DataUpload
    from app.models.user import User


class IndicatorData(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    Time-series data for ESG indicators.
    
    Stores actual measurements/values for each indicator over time.
    """
    
    __tablename__ = "indicator_data"
    
    __table_args__ = (
        Index("ix_indicator_data_indicator_date", "indicator_id", "date"),
        Index("ix_indicator_data_org_date", "organization_id", "date"),
    )
    
    # Relationships
    indicator_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("indicators.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    organization_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Organization scope (NULL for tenant-wide)",
    )
    
    upload_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("data_uploads.id", ondelete="SET NULL"),
        nullable=True,
        comment="Source upload if imported from file",
    )
    
    # Data
    date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
        comment="Measurement date",
    )
    
    value: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Indicator value",
    )
    
    # Metadata
    unit: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="Unit of measure (copied from indicator)",
    )
    
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Additional notes",
    )
    
    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="manual",
        comment="Data source: manual, upload, api, integration",
    )
    
    # Quality flags
    is_verified: Mapped[bool] = mapped_column(
        nullable=False,
        default=False,
        comment="Data verified by reviewer",
    )
    
    is_estimated: Mapped[bool] = mapped_column(
        nullable=False,
        default=False,
        comment="Value is estimated/projected",
    )
    
    # Validation workflow
    validation_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", index=True
    )
    submitted_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    submitted_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    reviewed_by: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    reviewer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # SQLAlchemy relationships
    indicator: Mapped["Indicator"] = relationship("Indicator")
    organization: Mapped[Optional["Organization"]] = relationship("Organization")
    upload: Mapped[Optional["DataUpload"]] = relationship("DataUpload")
    tenant: Mapped["Tenant"] = relationship("Tenant")
    submitter: Mapped[Optional["User"]] = relationship("User", foreign_keys=[submitted_by])
    reviewer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[reviewed_by])
    
    def __repr__(self) -> str:
        return f"<IndicatorData(indicator_id={self.indicator_id}, date={self.date}, value={self.value})>"

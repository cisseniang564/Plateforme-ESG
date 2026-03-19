"""ESG Score Model."""
from typing import TYPE_CHECKING, Optional
from uuid import UUID
from datetime import date
from sqlalchemy import String, Float, Date, Text, JSON, Index, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.organization import Organization

class ESGScore(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "esg_scores"
    __table_args__ = (
        Index("idx_esg_scores_org_date", "organization_id", "calculation_date"),
        Index("idx_esg_scores_tenant_date", "tenant_id", "calculation_date"),
    )
    
    organization_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    calculation_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    environmental_score: Mapped[float] = mapped_column(Float, nullable=False)
    social_score: Mapped[float] = mapped_column(Float, nullable=False)
    governance_score: Mapped[float] = mapped_column(Float, nullable=False)
    overall_score: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    rating: Mapped[str] = mapped_column(String(10), nullable=False)
    calculation_method: Mapped[str] = mapped_column(String(50), nullable=False, default="weighted_average")
    sector_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    weights_applied: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    indicator_contributions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    percentile_rank: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sector_median: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    data_completeness: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    confidence_level: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    organization: Mapped["Organization"] = relationship("Organization", foreign_keys=[organization_id], back_populates="esg_scores")

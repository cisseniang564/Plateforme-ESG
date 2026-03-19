"""
ESG Indicator model - KPIs and metrics.
"""
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import String, Float, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class Indicator(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    ESG Indicator - Key Performance Indicators.
    """
    
    __tablename__ = "indicators"
    
    # Identification
    code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
        comment="Unique code: ENV-001, SOC-042, GOV-015",
    )
    name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        comment="Indicator name: Carbon Emissions",
    )
    
    # Classification ESG
    pillar: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        comment="ESG pillar: environmental, social, governance",
    )
    category: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Sub-category: climate, water, diversity, etc.",
    )
    
    # Mesure
    unit: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Unit of measure: tCO2e, m³, %, #, EUR",
    )
    data_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="numeric",
        comment="Data type: numeric, percentage, boolean, text",
    )
    
    # Description
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    calculation_method: Mapped[Optional[str]] = mapped_column(
        String,
        nullable=True,
        comment="How to calculate this indicator",
    )
    
    # Configuration
    weight: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Weight in score calculation (0-1)",
    )
    target_value: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Target/goal value",
    )
    
    # Status
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    is_mandatory: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Required by regulation/framework",
    )
    
    # Références
    framework: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="Framework: GRI, SASB, TCFD, CDP",
    )
    framework_reference: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Framework code: GRI 305-1, SASB EM-IS-110a.1",
    )
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="indicators")
    
    def __repr__(self) -> str:
        return f"<Indicator(code='{self.code}', name='{self.name}', pillar='{self.pillar}')>"

"""Sector Weight Model."""
from typing import Optional
from sqlalchemy import String, Float, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin

class SectorWeight(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "sector_weights"
    __table_args__ = (
        UniqueConstraint("tenant_id", "sector_code", name="uq_sector_weights_tenant_sector"),
    )
    
    sector_code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    sector_name: Mapped[str] = mapped_column(String(200), nullable=False)
    environmental_weight: Mapped[float] = mapped_column(Float, nullable=False, default=33.33)
    social_weight: Mapped[float] = mapped_column(Float, nullable=False, default=33.33)
    governance_weight: Mapped[float] = mapped_column(Float, nullable=False, default=33.34)
    indicator_weights: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    benchmarks: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

"""Indicator Formula Model."""
from typing import TYPE_CHECKING, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy import String, Text, Boolean, JSON, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PGUUID, TIMESTAMP
from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.indicator import Indicator

class IndicatorFormula(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "indicator_formulas"
    
    indicator_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), 
        ForeignKey("indicators.id", ondelete="CASCADE"),
        nullable=False, 
        index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    formula_type: Mapped[str] = mapped_column(String(50), nullable=False)
    expression: Mapped[str] = mapped_column(Text, nullable=False)
    dependencies: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    parameters: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    effective_from: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    effective_until: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

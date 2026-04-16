"""
Integration model - Third-party integrations.
"""
from typing import TYPE_CHECKING, Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy import String, Boolean, JSON, Text, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class IntegrationType(str, enum.Enum):
    """Integration types."""
    GOOGLE_SHEETS = "google_sheets"
    POWER_BI = "power_bi"
    TABLEAU = "tableau"
    EXCEL_ONLINE = "excel_online"
    LOOKER = "looker"
    CUSTOM_API = "custom_api"
    ENEDIS = "enedis"


class Integration(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    Third-party integration configuration.
    """
    
    __tablename__ = "integrations"
    
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Integration name",
    )
    
    type: Mapped[IntegrationType] = mapped_column(
        SQLEnum(IntegrationType),
        nullable=False,
        index=True,
        comment="Integration type",
    )
    
    config: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
        comment="Integration configuration (credentials, settings)",
    )
    
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether integration is active",
    )
    
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
        comment="Last successful sync timestamp",
    )
    
    last_error: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Last error message",
    )
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant")
    
    def __repr__(self) -> str:
        return f"<Integration(name={self.name}, type={self.type})>"

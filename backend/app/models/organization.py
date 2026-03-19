"""Organization model."""
from typing import TYPE_CHECKING, Optional
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.indicator_data import IndicatorData
    from app.models.esg_score import ESGScore

class OrganizationType(str, enum.Enum):
    COMPANY = "company"
    SUBSIDIARY = "subsidiary"
    SUPPLIER = "supplier"
    CUSTOMER = "customer"
    PARTNER = "partner"
    INTERNAL = "internal"

class Organization(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "organizations"
    
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    external_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="company")
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    custom_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="organizations")
    indicator_data: Mapped[list["IndicatorData"]] = relationship(
        "IndicatorData", back_populates="organization", cascade="all, delete-orphan"
    )
    esg_scores: Mapped[list["ESGScore"]] = relationship(
        "ESGScore", foreign_keys="ESGScore.organization_id", back_populates="organization", cascade="all, delete-orphan"
    )

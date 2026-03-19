"""
Tenant model - Multi-tenant isolation.
"""
from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, Boolean, Text, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.organization import Organization
    from app.models.indicator import Indicator
    from app.models.materiality import MaterialityIssue, ESGRisk


class Tenant(Base, UUIDMixin, TimestampMixin):
    """
    Tenant model for multi-tenant isolation.
    """
    __tablename__ = "tenants"

    # Colonnes qui EXISTENT dans la DB
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    plan_tier: Mapped[str] = mapped_column(String(50), nullable=False, default="free")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    billing_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    settings: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict, server_default='{}')
    feature_flags: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict, server_default='{}')
    max_users: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    max_orgs: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    max_monthly_api_calls: Mapped[int] = mapped_column(Integer, nullable=False, default=10000)
    data_retention_months: Mapped[int] = mapped_column(Integer, nullable=False, default=12)

    # Relationships
    users: Mapped[list["User"]] = relationship(
        "User", back_populates="tenant", cascade="all, delete-orphan"
    )
    organizations: Mapped[list["Organization"]] = relationship(
        "Organization", back_populates="tenant", cascade="all, delete-orphan"
    )
    indicators: Mapped[list["Indicator"]] = relationship(
        "Indicator", back_populates="tenant", cascade="all, delete-orphan"
    )
    
    # Materiality & Risks
    materiality_issues: Mapped[list["MaterialityIssue"]] = relationship(
        "MaterialityIssue", back_populates="tenant", cascade="all, delete-orphan"
    )
    esg_risks: Mapped[list["ESGRisk"]] = relationship(
        "ESGRisk", back_populates="tenant", cascade="all, delete-orphan"
    )
    
    @property
    def is_active(self) -> bool:
        """Compatibility property for is_active"""
        return self.status == "active"
    
    @property
    def subscription_tier(self) -> str:
        """Compatibility property for subscription_tier"""
        return self.plan_tier

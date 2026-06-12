"""
Tenant model - Multi-tenant isolation.
"""
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, Boolean, Text, Integer, JSON, TIMESTAMP
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
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    plan_tier: Mapped[str] = mapped_column(String(50), nullable=False, default="free")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    billing_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    stripe_subscription_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    stripe_current_period_end: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    trial_ends_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
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

    @property
    def billing_is_active(self) -> bool:
        """True if subscription is genuinely active (paid or within trial window)."""
        s = self.stripe_subscription_status or ""
        if s in ("active", "past_due"):
            # Paid Stripe subscription — always active (past_due has a grace period)
            return True
        if s == "trialing":
            # Trial counts as active ONLY while the trial window is still open
            return self.is_in_trial
        if not s:
            # No Stripe status yet (e.g. fresh account) — active if still in trial
            return self.is_in_trial
        # canceled, incomplete, unpaid, etc.
        return False

    @property
    def is_in_trial(self) -> bool:
        """True if still in free trial period."""
        if not self.trial_ends_at:
            return False
        from datetime import timezone
        return datetime.now(timezone.utc) < self.trial_ends_at

    # ── Quota enforcement ─────────────────────────────────────────────────────

    def can_create_user(self, current_count: int) -> bool:
        """
        True if adding one more user is within the plan quota.
        max_users < 0 means unlimited (enterprise).
        """
        if self.max_users < 0:
            return True
        return current_count < self.max_users

    def can_create_org(self, current_count: int) -> bool:
        """
        True if adding one more organization is within the plan quota.
        max_orgs < 0 means unlimited (enterprise).
        """
        if self.max_orgs < 0:
            return True
        return current_count < self.max_orgs

    def apply_plan_limits(self, tier: str | None = None) -> None:
        """
        Reset quota fields to the canonical PLAN_LIMITS for a given tier.
        If no tier is given, re-applies limits for self.plan_tier.
        """
        from app.core.plan_limits import get_limits
        target = tier or self.plan_tier
        limits = get_limits(target)
        self.plan_tier = target
        self.max_users = limits["max_users"]
        self.max_orgs = limits["max_orgs"]
        self.max_monthly_api_calls = limits["max_monthly_api_calls"]
        self.data_retention_months = limits["data_retention_months"]

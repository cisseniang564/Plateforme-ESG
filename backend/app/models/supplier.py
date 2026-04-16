"""Supplier model — supply chain ESG management."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime, Float, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin


class Supplier(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    Supplier record for supply chain ESG assessment.

    Belongs to a tenant and holds ESG scores, risk classification,
    and portal token for supplier self-assessment.
    """

    __tablename__ = "suppliers"

    # Identity
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="e.g. raw_materials, logistics, services",
    )
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Size & financials
    employees: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    annual_revenue_k_eur: Mapped[Optional[float]] = mapped_column(
        Numeric(12, 2), nullable=True
    )
    spend_k_eur: Mapped[Optional[float]] = mapped_column(
        Numeric(12, 2), nullable=True
    )

    # Risk & status
    risk_level: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        default="medium",
        comment="low / medium / high / critical",
    )
    status: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        default="pending",
        comment="pending / active / suspended / archived",
    )

    # ESG scores (0-100)
    global_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    env_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    social_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    gov_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Structured data
    flags: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="List of issue flags, e.g. ['missing_certifications']",
    )
    questionnaire_data: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Raw questionnaire answers submitted by the supplier",
    )

    # Supplier self-assessment portal
    portal_token: Mapped[Optional[str]] = mapped_column(
        String(64),
        unique=True,
        nullable=True,
        index=True,
    )
    portal_token_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    questionnaire_completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_scored_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<Supplier(id={self.id}, name='{self.name}', tenant_id={self.tenant_id})>"

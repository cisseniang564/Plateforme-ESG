"""Organization model — supports multi-entity hierarchy with parent/child.

The model carries everything OrganizationService and OrganizationCreateRequest
expect: identity (SIREN/LEI/VAT), metrics (employees, revenue, surface),
consolidation (method, ownership %), and the self-referential parent_org_id
that powers multi-entity roll-ups.
"""
from typing import TYPE_CHECKING, Optional
from decimal import Decimal
from uuid import UUID
import enum

from sqlalchemy import String, Boolean, Integer, Numeric, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSON, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant
    from app.models.indicator_data import IndicatorData
    from app.models.esg_score import ESGScore


class OrganizationType(str, enum.Enum):
    COMPANY = "company"
    GROUP = "group"
    BUSINESS_UNIT = "business_unit"
    SUBSIDIARY = "subsidiary"
    SITE = "site"
    DEPARTMENT = "department"
    SUPPLIER = "supplier"
    CUSTOMER = "customer"
    PARTNER = "partner"
    INTERNAL = "internal"


class ConsolidationMethod(str, enum.Enum):
    """How a subsidiary's data rolls up to its parent.

    Aligned with IFRS 10 / Code de commerce art. L233-16:
      * full      — Intégration globale (100% rollup, control)
      * proportional — Intégration proportionnelle (rollup × ownership_pct)
      * equity    — Mise en équivalence (no rollup, equity-accounted)
      * none      — No consolidation
    """
    FULL = "full"
    PROPORTIONAL = "proportional"
    EQUITY = "equity"
    NONE = "none"


class Organization(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """A reporting entity (group, subsidiary, site, department, supplier…).

    Hierarchy is materialized via ``parent_org_id``. Roll-ups for ESG indicators
    use ``consolidation_method`` + ``ownership_percentage``.
    """
    __tablename__ = "organizations"

    # ── Identity ─────────────────────────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    legal_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    external_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    org_type: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, default="company",
        comment="One of OrganizationType (group, business_unit, site, ...)"
    )

    # ── Legal identifiers ────────────────────────────────────────────────────
    siren: Mapped[Optional[str]] = mapped_column(
        String(9), nullable=True, index=True,
        comment="French SIREN (9 digits) — required for legal reporting"
    )
    siret: Mapped[Optional[str]] = mapped_column(
        String(14), nullable=True,
        comment="French SIRET (14 digits) — site-level identifier"
    )
    lei_code: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True,
        comment="Legal Entity Identifier (ISO 17442)"
    )
    vat_number: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True,
        comment="EU VAT number (e.g. FR12345678901)"
    )

    # ── Sector & geography ───────────────────────────────────────────────────
    sector_code: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, index=True,
        comment="NAF/APE (FR) or NACE (EU) sector code"
    )
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country_code: Mapped[Optional[str]] = mapped_column(
        String(2), nullable=True, default="FR",
        comment="ISO 3166-1 alpha-2 (FR, DE, ES, ...)"
    )

    # ── Business metrics (used for materiality thresholds and roll-up) ──────
    employee_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    revenue_eur: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 2), nullable=True,
        comment="Annual revenue in EUR (informational; CSRD vague triggers)"
    )
    surface_m2: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(12, 2), nullable=True,
        comment="Total floor surface in m² (useful for energy intensity KPIs)"
    )

    # ── Multi-entity hierarchy ───────────────────────────────────────────────
    parent_org_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True, index=True,
        comment="Parent organization id — NULL for top-level (group head)"
    )
    consolidation_method: Mapped[Optional[str]] = mapped_column(
        String(20), nullable=True, default="full",
        comment="One of ConsolidationMethod (full, proportional, equity, none)"
    )
    ownership_percentage: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2), nullable=True, default=Decimal("100.00"),
        comment="Parent's ownership % of this entity (0-100). Used for proportional consolidation."
    )

    # ── State ────────────────────────────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true",
        comment="Inactive orgs are hidden from default lists but kept for history"
    )

    # ── Extensibility ────────────────────────────────────────────────────────
    custom_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)

    # ── Relationships ────────────────────────────────────────────────────────
    tenant: Mapped["Tenant"] = relationship(
        "Tenant", back_populates="organizations", foreign_keys="Organization.tenant_id"
    )

    # Self-referential parent / children (lazy="selectin" disabled to allow
    # explicit loading via selectinload in queries — avoids N+1 surprises).
    parent: Mapped[Optional["Organization"]] = relationship(
        "Organization",
        remote_side="Organization.id",
        foreign_keys=[parent_org_id],
        back_populates="children",
    )
    children: Mapped[list["Organization"]] = relationship(
        "Organization",
        foreign_keys=[parent_org_id],
        back_populates="parent",
        cascade="save-update, merge",  # NOT delete — subsidiaries stay if parent removed
    )

    indicator_data: Mapped[list["IndicatorData"]] = relationship(
        "IndicatorData", back_populates="organization", cascade="all, delete-orphan"
    )
    esg_scores: Mapped[list["ESGScore"]] = relationship(
        "ESGScore",
        foreign_keys="ESGScore.organization_id",
        back_populates="organization",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_org_tenant_parent", "tenant_id", "parent_org_id"),
        Index("idx_org_tenant_active", "tenant_id", "is_active"),
    )

    # ── Convenience helpers ──────────────────────────────────────────────────
    @property
    def is_root(self) -> bool:
        """True if this organization is at the top of its hierarchy."""
        return self.parent_org_id is None

    @property
    def is_leaf(self) -> bool:
        """True if this organization has no children loaded (or none at all)."""
        # Note: only meaningful when children relationship has been loaded.
        return not bool(self.children)

    def effective_ownership(self) -> Decimal:
        """Ownership share to use for proportional consolidation (0-1)."""
        if self.consolidation_method == "full":
            return Decimal("1.0")
        if self.consolidation_method == "equity" or self.consolidation_method == "none":
            return Decimal("0.0")
        # proportional
        pct = self.ownership_percentage or Decimal("100.00")
        return (pct / Decimal("100")).quantize(Decimal("0.0001"))

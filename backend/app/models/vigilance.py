"""
Vigilance models — Plan de vigilance (Loi 2017-399) + Sapin 2 corruption.

The two laws are bundled here because they target overlapping populations
(large French groups) and share infrastructure (risk mapping, alert channel,
training tracking, monitoring).

LEGAL REFERENCES
----------------
* Loi n°2017-399 du 27 mars 2017 (devoir de vigilance) — Code de commerce
  art. L225-102-4 / L225-102-5: required for SAs/SCAs with > 5000 employees
  in France or > 10000 worldwide (parent + direct/indirect subsidiaries).
  The plan must contain 5 mandatory components:
    1. Cartographie des risques
    2. Procédures d'évaluation régulière (filiales, fournisseurs, sous-traitants)
    3. Actions adaptées d'atténuation / prévention
    4. Mécanisme d'alerte et de recueil des signalements
    5. Dispositif de suivi des mesures + évaluation
  Published yearly in the rapport de gestion.

* Loi n°2016-1691 du 9 décembre 2016 (Sapin 2) — for companies >500 emp & CA
  >100M€ in France. AFA-supervised. 8 pillars including internal alert
  mechanism (Art. 8 - Décret 2017-564) — shared with the vigilance alert
  channel here.

DESIGN NOTES
------------
* All vigilance models inherit TenantMixin → row-level isolation.
* VigilanceAlert supports anonymous reports (reporter_email NULL) AND
  authenticated reports (reporter_email set).
* The plan is yearly (one VigilancePlan per (tenant, year)).
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional
from datetime import datetime, date
from uuid import UUID
import enum

from sqlalchemy import (
    String, Text, Integer, Boolean, Date, DateTime,
    ForeignKey, Index, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSON, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


# ─── Enums ──────────────────────────────────────────────────────────────────
class VigilancePlanStatus(str, enum.Enum):
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class RiskCategory(str, enum.Enum):
    """Risk categories covered by Art. L225-102-4 (devoir de vigilance)."""
    HUMAN_RIGHTS = "human_rights"           # Droits humains
    FUNDAMENTAL_FREEDOMS = "freedoms"       # Libertés fondamentales
    HEALTH_SAFETY = "health_safety"         # Santé & sécurité personnes
    ENVIRONMENT = "environment"             # Atteintes graves environnement
    LABOR_RIGHTS = "labor_rights"           # Droits du travail (ILO)
    CORRUPTION = "corruption"               # Sapin 2 — corruption / trafic d'influence
    DATA_PRIVACY = "data_privacy"           # Vie privée / RGPD
    OTHER = "other"


class RiskScope(str, enum.Enum):
    """Where the risk materializes in the value chain."""
    OWN_OPERATIONS = "own_operations"       # Activités propres
    SUBSIDIARIES = "subsidiaries"           # Filiales sous contrôle
    TIER1_SUPPLIERS = "tier1_suppliers"     # Fournisseurs directs
    TIER2_PLUS_SUPPLIERS = "tier2_plus"     # Fournisseurs indirects
    SUBCONTRACTORS = "subcontractors"       # Sous-traitants
    CLIENTS = "clients"                     # Clients (rare mais possible)


class AlertStatus(str, enum.Enum):
    NEW = "new"
    UNDER_REVIEW = "under_review"
    INVESTIGATING = "investigating"
    ACTION_TAKEN = "action_taken"
    CLOSED = "closed"
    DISMISSED = "dismissed"


class ActionStatus(str, enum.Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    BLOCKED = "blocked"
    CANCELLED = "cancelled"


# ─── Models ─────────────────────────────────────────────────────────────────
class VigilancePlan(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """A yearly Plan de vigilance (Art. L225-102-4 Code de commerce)."""

    __tablename__ = "vigilance_plans"

    year: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", server_default="draft",
        comment="One of VigilancePlanStatus values"
    )

    # 5 mandatory components — narrative text blocks
    risk_mapping_summary: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Cartographie des risques — narrative summary"
    )
    assessment_procedures: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Procédures d'évaluation régulière (filiales/fournisseurs/sous-traitants)"
    )
    mitigation_actions: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Actions adaptées d'atténuation des risques"
    )
    alert_mechanism: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Description du mécanisme d'alerte (Art. L225-102-4-II)"
    )
    monitoring_scheme: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Dispositif de suivi des mesures + évaluation efficacité"
    )

    # Scope coverage flags (used for compliance check)
    covers_subsidiaries: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    covers_suppliers: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    covers_subcontractors: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Stakeholder consultation (recommended by AFA)
    stakeholders_consulted: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True,
        comment="Parties prenantes consultées dans l'élaboration du plan"
    )

    # Publication tracking
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    published_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True,
        comment="URL du rapport de gestion contenant le plan publié"
    )
    approved_by_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    risks: Mapped[list["VigilanceRisk"]] = relationship(
        "VigilanceRisk", back_populates="plan",
        cascade="all, delete-orphan",
        primaryjoin="VigilancePlan.id==VigilanceRisk.plan_id",
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "year", name="uq_vigilance_plan_tenant_year"),
        Index("idx_vigilance_plan_status", "tenant_id", "status"),
    )


class VigilanceRisk(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """A single risk identified in the cartographie des risques."""

    __tablename__ = "vigilance_risks"

    plan_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("vigilance_plans.id", ondelete="CASCADE"),
        nullable=True, index=True,
        comment="The plan this risk belongs to. NULL for risks not yet assigned to a plan year."
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    category: Mapped[str] = mapped_column(
        String(30), nullable=False, index=True,
        comment="One of RiskCategory values"
    )
    scope: Mapped[str] = mapped_column(
        String(30), nullable=False,
        comment="One of RiskScope values"
    )

    # 5×5 risk matrix (gross — before mitigation)
    severity: Mapped[int] = mapped_column(Integer, nullable=False, comment="1 (low) to 5 (catastrophic)")
    likelihood: Mapped[int] = mapped_column(Integer, nullable=False, comment="1 (rare) to 5 (certain)")

    # 5×5 residual (after mitigation actions)
    residual_severity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    residual_likelihood: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Geography (helpful for supply-chain risks)
    countries: Mapped[Optional[list]] = mapped_column(
        JSON, nullable=True,
        comment="ISO 3166-1 alpha-2 country codes (e.g. ['CN', 'BD'])"
    )

    # References to the source (e.g. SBM-3 IRO ID, audit report, supplier ID)
    source_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    owner_user_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    plan: Mapped[Optional["VigilancePlan"]] = relationship(
        "VigilancePlan", back_populates="risks",
        foreign_keys=[plan_id],
    )
    actions: Mapped[list["VigilanceAction"]] = relationship(
        "VigilanceAction", back_populates="risk",
        cascade="all, delete-orphan",
        primaryjoin="VigilanceRisk.id==VigilanceAction.risk_id",
    )

    __table_args__ = (
        Index("idx_vigilance_risk_plan", "plan_id"),
        Index("idx_vigilance_risk_category", "tenant_id", "category"),
        Index("idx_vigilance_risk_score", "tenant_id", "severity", "likelihood"),
    )

    @property
    def gross_score(self) -> int:
        """Gross risk score = severity × likelihood (1-25)."""
        return self.severity * self.likelihood

    @property
    def residual_score(self) -> Optional[int]:
        if self.residual_severity is None or self.residual_likelihood is None:
            return None
        return self.residual_severity * self.residual_likelihood


class VigilanceAction(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """A mitigation action attached to a specific risk."""

    __tablename__ = "vigilance_actions"

    risk_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("vigilance_risks.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="planned", server_default="planned",
        comment="One of ActionStatus values"
    )
    priority: Mapped[str] = mapped_column(
        String(10), nullable=False, default="medium", server_default="medium",
        comment="low / medium / high / critical"
    )

    deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    completed_at: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    owner_user_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    budget_eur: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    evidence_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    risk: Mapped["VigilanceRisk"] = relationship(
        "VigilanceRisk", back_populates="actions",
        foreign_keys=[risk_id],
    )

    __table_args__ = (
        Index("idx_vigilance_action_status", "tenant_id", "status"),
        Index("idx_vigilance_action_deadline", "tenant_id", "deadline"),
    )


class VigilanceAlert(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    An incoming report from the alert mechanism (Art. L225-102-4-II + Sapin 2 Art. 8).

    Supports both anonymous and authenticated reports. Anonymous reports use
    a generated short ``case_number`` (e.g. ``VIG-2026-001``) that the reporter
    can use later to follow the case status without revealing identity.
    """

    __tablename__ = "vigilance_alerts"

    case_number: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True,
        comment="Generated case ID (e.g. VIG-2026-001) — shared with the reporter"
    )

    # Reporter (optional — anonymous allowed)
    reporter_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    reporter_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reporter_role: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True,
        comment="employee / supplier / community / other"
    )
    is_anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Content
    category: Mapped[str] = mapped_column(
        String(30), nullable=False, index=True,
        comment="One of RiskCategory values"
    )
    severity: Mapped[str] = mapped_column(
        String(10), nullable=False, default="medium",
        comment="low / medium / high / critical"
    )
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Geography / context
    country: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    organization_concerned: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Lifecycle
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="new", server_default="new",
        comment="One of AlertStatus values"
    )
    assigned_to_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closure_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Source channel — informational
    source: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, default="web_form",
        comment="web_form / email / phone / postal / other"
    )

    # Linked risk (optional — established during triage)
    linked_risk_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("vigilance_risks.id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "case_number", name="uq_vigilance_alert_case"),
        Index("idx_vigilance_alert_status", "tenant_id", "status"),
        Index("idx_vigilance_alert_category", "tenant_id", "category"),
    )

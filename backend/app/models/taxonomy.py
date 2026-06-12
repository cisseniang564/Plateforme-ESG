"""
Taxonomy models — EU Regulation 2020/852 (Taxonomy Regulation).

Replaces the previous Redis-backed plan storage. The plan moves from a
volatile key-value to a proper DB-backed entity model:
  * TaxonomyAssessment — one per (tenant, year) — overall context
  * TaxonomyActivity — individual NACE activities with eligibility, alignment
    (substantial contribution + DNSH + minimum safeguards), financial KPIs
    (turnover, capex, opex)

Aligned with:
  * Reglement (UE) 2020/852
  * Acte Delegue Climatique (UE) 2021/2139 (Annexes I & II)
  * Acte Delegue Disclosures (UE) 2021/2178
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Optional
from uuid import UUID
from datetime import datetime
import enum

from sqlalchemy import (
    String, Text, Integer, Boolean, Numeric, DateTime,
    ForeignKey, Index, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSON, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin


class TaxonomyObjective(str, enum.Enum):
    """6 environmental objectives of the EU Taxonomy."""
    CLIMATE_MITIGATION = "climate_mitigation"
    CLIMATE_ADAPTATION = "climate_adaptation"
    WATER_MARINE = "water_marine"
    CIRCULAR_ECONOMY = "circular_economy"
    POLLUTION = "pollution"
    BIODIVERSITY = "biodiversity"


class TaxonomyAlignmentStatus(str, enum.Enum):
    """Per-activity alignment outcome."""
    ALIGNED = "aligned"
    PARTIAL = "partial"
    NOT_ALIGNED = "not_aligned"
    NOT_ELIGIBLE = "not_eligible"
    UNASSESSED = "unassessed"


class TaxonomyAssessment(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """A yearly EU Taxonomy assessment context for the tenant."""
    __tablename__ = "taxonomy_assessments"

    year: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft", server_default="draft",
        comment="draft / approved / published"
    )

    # Aggregate KPIs (recomputed on demand from activities)
    total_turnover_eur: Mapped[Optional[float]] = mapped_column(
        Numeric(20, 2), nullable=True,
        comment="Total annual turnover (denominator for KPI Turnover)"
    )
    total_capex_eur: Mapped[Optional[float]] = mapped_column(
        Numeric(20, 2), nullable=True,
        comment="Total capital expenditure (denominator for KPI CapEx)"
    )
    total_opex_eur: Mapped[Optional[float]] = mapped_column(
        Numeric(20, 2), nullable=True,
        comment="Total operating expenditure (denominator for KPI OpEx)"
    )

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    activities: Mapped[list["TaxonomyActivity"]] = relationship(
        "TaxonomyActivity", back_populates="assessment",
        cascade="all, delete-orphan",
        primaryjoin="TaxonomyAssessment.id==TaxonomyActivity.assessment_id",
    )

    __table_args__ = (
        UniqueConstraint("tenant_id", "year", name="uq_taxonomy_assess"),
        Index("idx_taxonomy_assess_tenant", "tenant_id"),
    )


class TaxonomyActivity(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """One activity (typically NACE-coded) within a taxonomy assessment."""
    __tablename__ = "taxonomy_activities"

    assessment_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("taxonomy_assessments.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    # Activity identification
    activity_code: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True,
        comment="NACE code or EU activity reference (e.g. 4.1, 7.1)"
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    objective: Mapped[str] = mapped_column(
        String(40), nullable=False, default="climate_mitigation",
        server_default="climate_mitigation",
        comment="One of TaxonomyObjective values"
    )

    # Eligibility / alignment
    is_eligible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true",
        comment="True if listed in the Climate Delegated Act annexes"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="unassessed",
        server_default="unassessed",
        comment="One of TaxonomyAlignmentStatus"
    )

    # Substantial contribution
    substantial_contribution: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
        comment="Meets technical screening criteria for chosen objective"
    )

    # DNSH (Do No Significant Harm) — 5 other objectives
    dnsh_climate_mitigation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    dnsh_climate_adaptation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    dnsh_water_marine: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    dnsh_circular_economy: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    dnsh_pollution: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    dnsh_biodiversity: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    # Minimum safeguards (OECD MNE, UN Guiding Principles on Business & Human Rights)
    minimum_safeguards: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false",
        comment="Compliance with OECD MNE Guidelines + UN Guiding Principles"
    )

    # Financial KPIs (€)
    turnover_eur: Mapped[Optional[float]] = mapped_column(Numeric(20, 2), nullable=True)
    capex_eur: Mapped[Optional[float]] = mapped_column(Numeric(20, 2), nullable=True)
    opex_eur: Mapped[Optional[float]] = mapped_column(Numeric(20, 2), nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Relationships
    assessment: Mapped["TaxonomyAssessment"] = relationship(
        "TaxonomyAssessment", back_populates="activities",
        foreign_keys=[assessment_id],
    )

    __table_args__ = (
        Index("idx_taxonomy_act_assess", "assessment_id"),
        Index("idx_taxonomy_act_status", "tenant_id", "status"),
        Index("idx_taxonomy_act_objective", "tenant_id", "objective"),
    )

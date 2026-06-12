"""
SBTi (Science Based Targets initiative) Commitment Tracking.

Persists a tenant's emission-reduction commitment with all metadata needed
to produce the official target validation dossier for SBTi submission:
  - Method (1.5°C, Well-Below-2°C, FLAG, SDA)
  - Baseline year + emissions (Scope 1/2/3)
  - Target year + reduction percentage
  - Net-zero year
  - Submission lifecycle (not_committed → letter_sent → targets_set → validated)

A tenant typically has one active commitment per organization; historical
revisions are kept for audit trail.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional

from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Index, Text, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SBTiCommitment(Base):
    __tablename__ = "sbti_commitments"

    id:               Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id:        Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    organization_id:  Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True, index=True)

    # ── Status lifecycle ────────────────────────────────────────────────
    # not_committed | letter_sent | targets_set | submitted | validated | rejected
    status:           Mapped[str] = mapped_column(String(32), nullable=False, default="not_committed", index=True)

    # ── Method ──────────────────────────────────────────────────────────
    # 1.5C | WB2C (Well-Below 2°C) | FLAG (Forest, Land, Agriculture) | SDA (Sectoral Decarbonization Approach)
    method:           Mapped[str] = mapped_column(String(16), nullable=False, default="1.5C")

    # ── Baseline ────────────────────────────────────────────────────────
    baseline_year:           Mapped[int]   = mapped_column(Integer, nullable=False)
    baseline_scope1_tco2e:   Mapped[Optional[float]] = mapped_column(Float)
    baseline_scope2_tco2e:   Mapped[Optional[float]] = mapped_column(Float)
    baseline_scope3_tco2e:   Mapped[Optional[float]] = mapped_column(Float)
    baseline_total_tco2e:    Mapped[float] = mapped_column(Float, nullable=False)

    # ── Near-term target ────────────────────────────────────────────────
    near_term_target_year:        Mapped[int]   = mapped_column(Integer, nullable=False)
    near_term_reduction_pct:      Mapped[float] = mapped_column(Float, nullable=False)
    near_term_scope_coverage:     Mapped[Optional[str]] = mapped_column(String(64))  # "scope1+2" | "scope1+2+3"

    # ── Long-term / Net-zero target ─────────────────────────────────────
    net_zero_year:                Mapped[Optional[int]]   = mapped_column(Integer)
    long_term_reduction_pct:      Mapped[Optional[float]] = mapped_column(Float)

    # ── Scope 3 specifics ───────────────────────────────────────────────
    scope3_screening_completed:   Mapped[bool] = mapped_column(default=False, nullable=False)
    scope3_pct_of_total:          Mapped[Optional[float]] = mapped_column(Float)
    scope3_target_pct:            Mapped[Optional[float]] = mapped_column(Float)

    # ── Submission tracking ─────────────────────────────────────────────
    commitment_letter_sent_at:    Mapped[Optional[datetime]] = mapped_column(DateTime)
    target_submission_sent_at:    Mapped[Optional[datetime]] = mapped_column(DateTime)
    validated_at:                 Mapped[Optional[datetime]] = mapped_column(DateTime)
    sbti_company_id:              Mapped[Optional[str]] = mapped_column(String(64))  # Once registered with SBTi

    # ── Additional context ──────────────────────────────────────────────
    organization_name:    Mapped[Optional[str]] = mapped_column(String(255))
    sector:               Mapped[Optional[str]] = mapped_column(String(128))
    revenue_meur:         Mapped[Optional[float]] = mapped_column(Float)
    employees:            Mapped[Optional[int]]   = mapped_column(Integer)
    contact_name:         Mapped[Optional[str]]   = mapped_column(String(255))
    contact_email:        Mapped[Optional[str]]   = mapped_column(String(255))
    contact_role:         Mapped[Optional[str]]   = mapped_column(String(255))
    notes:                Mapped[Optional[str]]   = mapped_column(Text)

    # Last preflight validation result (JSON snapshot — for audit trail)
    last_validation:      Mapped[Optional[dict]] = mapped_column(JSON)

    created_by:           Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True))
    created_at:           Mapped[datetime]       = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at:           Mapped[datetime]       = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_sbti_commitments_tenant_status", "tenant_id", "status"),
    )

"""
Life Cycle Assessment (LCA) — product-level emission tracking.

Each row represents one product (or product family) with its full cradle-to-grave
inputs encoded in the ``stages`` JSON column. We chose JSON over a many-to-many
relational schema because:
  - LCA inputs are heterogeneous (kg of material A, kWh of energy, t.km of transport)
  - The product model is fluid early-stage (different SKUs need different
    stage breakdowns)
  - All aggregation lives in Python (``LCAService.compute()``), not SQL

The schema is intentionally permissive: clients send a list of "items" per
stage with ``{factor_code, quantity, unit}`` and the service does the rest.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4
from typing import Optional

from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Index, Text, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LCAProduct(Base):
    __tablename__ = "lca_products"

    id:                Mapped[UUID]   = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id:         Mapped[UUID]   = mapped_column(PG_UUID(as_uuid=True), nullable=False, index=True)
    organization_id:   Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True, index=True)

    # ── Identity ────────────────────────────────────────────────────────
    sku:               Mapped[Optional[str]] = mapped_column(String(64), index=True)
    name:              Mapped[str]   = mapped_column(String(255), nullable=False)
    description:       Mapped[Optional[str]] = mapped_column(Text)
    category:          Mapped[Optional[str]] = mapped_column(String(64))

    # ── Functional unit ─────────────────────────────────────────────────
    # The basis on which impacts are normalized (e.g., "1 bottle 500ml",
    # "1 m² flooring", "1 unit"). Free text per ISO 14044.
    functional_unit:   Mapped[str]   = mapped_column(String(128), nullable=False, default="1 unité")
    annual_volume:     Mapped[Optional[float]] = mapped_column(Float)  # units produced per year (optional, for scale-up)

    # ── Cradle-to-grave inputs ─────────────────────────────────────────
    # JSON shape::
    #   {
    #     "raw_material":  [{factor_code, quantity, unit, note?}, ...],
    #     "manufacturing": [...],
    #     "energy":        [...],
    #     "transport":     [...],
    #     "packaging":     [...],
    #     "end_of_life":   [...],
    #   }
    stages:            Mapped[dict]  = mapped_column(JSON, nullable=False, default=dict)

    # ── Cached computation (so list views don't re-compute every load) ──
    cached_total_kgco2e:        Mapped[Optional[float]] = mapped_column(Float)
    cached_stages_breakdown:    Mapped[Optional[dict]]  = mapped_column(JSON)
    cached_computed_at:         Mapped[Optional[datetime]] = mapped_column(DateTime)

    # ── Compliance metadata ────────────────────────────────────────────
    # ISO 14040/14044 (LCA), EN 15978 (buildings), PEF (EU), PEP Ecopassport (electronics)
    standard:          Mapped[Optional[str]] = mapped_column(String(32))
    reviewer_name:     Mapped[Optional[str]] = mapped_column(String(255))
    reviewer_date:     Mapped[Optional[datetime]] = mapped_column(DateTime)
    notes:             Mapped[Optional[str]] = mapped_column(Text)

    created_by:        Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True))
    created_at:        Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at:        Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_lca_products_tenant_org", "tenant_id", "organization_id"),
    )

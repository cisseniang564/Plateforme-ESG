"""
Taxonomy Assessment Service — DB-backed replacement for the Redis-volatile
plan storage. Provides tenant-scoped CRUD for:
  * TaxonomyAssessment — one per (tenant, year)
  * TaxonomyActivity — individual NACE activities with eligibility, alignment,
    DNSH, minimum safeguards, financial KPIs

Aligned with:
  * Reglement (UE) 2020/852
  * Acte Delegue Climatique (UE) 2021/2139
  * Acte Delegue Disclosures (UE) 2021/2178
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.taxonomy import (
    TaxonomyAssessment, TaxonomyActivity,
    TaxonomyObjective, TaxonomyAlignmentStatus,
)

logger = logging.getLogger(__name__)


# ─── Status computation ─────────────────────────────────────────────────────
def compute_activity_status(activity: TaxonomyActivity) -> str:
    """
    Derive the alignment status from substantial contribution + DNSH +
    minimum safeguards flags.

    * not_eligible if is_eligible=False
    * unassessed   if no SC + no DNSH set
    * aligned      if SC + all DNSH (5 others) + minimum safeguards
    * partial      if SC but missing DNSH or safeguards
    * not_aligned  if no SC
    """
    if not activity.is_eligible:
        return TaxonomyAlignmentStatus.NOT_ELIGIBLE.value

    sc = bool(activity.substantial_contribution)
    objective = activity.objective

    # The DNSH check excludes the same objective as substantial contribution
    dnsh_map = {
        "climate_mitigation": activity.dnsh_climate_mitigation,
        "climate_adaptation": activity.dnsh_climate_adaptation,
        "water_marine": activity.dnsh_water_marine,
        "circular_economy": activity.dnsh_circular_economy,
        "pollution": activity.dnsh_pollution,
        "biodiversity": activity.dnsh_biodiversity,
    }
    dnsh_others = [v for k, v in dnsh_map.items() if k != objective]
    dnsh_ok = all(dnsh_others)
    safeguards_ok = bool(activity.minimum_safeguards)

    if not sc and not any(dnsh_others) and not safeguards_ok:
        return TaxonomyAlignmentStatus.UNASSESSED.value
    if sc and dnsh_ok and safeguards_ok:
        return TaxonomyAlignmentStatus.ALIGNED.value
    if sc:
        return TaxonomyAlignmentStatus.PARTIAL.value
    return TaxonomyAlignmentStatus.NOT_ALIGNED.value


class TaxonomyAssessmentService:
    """Tenant-scoped operations for Taxonomy assessments + activities."""

    def __init__(self, db: AsyncSession, tenant_id: UUID):
        self.db = db
        self.tenant_id = tenant_id

    # ── Assessments ────────────────────────────────────────────────────────
    async def get_or_create_assessment(self, year: int) -> TaxonomyAssessment:
        stmt = (
            select(TaxonomyAssessment)
            .where(TaxonomyAssessment.tenant_id == self.tenant_id)
            .where(TaxonomyAssessment.year == year)
            .options(selectinload(TaxonomyAssessment.activities))
            .limit(1)
        )
        result = await self.db.execute(stmt)
        assess = result.scalar_one_or_none()
        if assess is not None:
            return assess

        assess = TaxonomyAssessment(
            tenant_id=self.tenant_id,
            year=year,
            status="draft",
        )
        self.db.add(assess)
        await self.db.flush()
        return assess

    async def list_assessments(self) -> List[TaxonomyAssessment]:
        stmt = (
            select(TaxonomyAssessment)
            .where(TaxonomyAssessment.tenant_id == self.tenant_id)
            .order_by(TaxonomyAssessment.year.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_assessment(self, assessment_id: UUID) -> Optional[TaxonomyAssessment]:
        stmt = (
            select(TaxonomyAssessment)
            .where(TaxonomyAssessment.tenant_id == self.tenant_id)
            .where(TaxonomyAssessment.id == assessment_id)
            .options(selectinload(TaxonomyAssessment.activities))
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_assessment(
        self, assessment_id: UUID, patch: Dict[str, Any],
    ) -> Optional[TaxonomyAssessment]:
        assess = await self.get_assessment(assessment_id)
        if assess is None:
            return None
        allowed = {
            "status", "total_turnover_eur", "total_capex_eur", "total_opex_eur",
            "notes",
        }
        for k, v in patch.items():
            if k not in allowed or v is None:
                continue
            setattr(assess, k, v)
        if patch.get("status") == "published" and assess.published_at is None:
            assess.published_at = datetime.now(timezone.utc)
        assess.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        return assess

    # ── Activities ─────────────────────────────────────────────────────────
    async def list_activities(
        self, assessment_id: UUID,
    ) -> List[TaxonomyActivity]:
        stmt = (
            select(TaxonomyActivity)
            .where(TaxonomyActivity.tenant_id == self.tenant_id)
            .where(TaxonomyActivity.assessment_id == assessment_id)
            .order_by(TaxonomyActivity.objective, TaxonomyActivity.label)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create_activity(
        self, assessment_id: UUID, payload: Dict[str, Any],
    ) -> TaxonomyActivity:
        # Validate objective
        objective = payload.get("objective", "climate_mitigation")
        try:
            TaxonomyObjective(objective)
        except ValueError:
            objective = "climate_mitigation"

        activity = TaxonomyActivity(
            tenant_id=self.tenant_id,
            assessment_id=assessment_id,
            activity_code=payload.get("activity_code"),
            label=payload["label"],
            description=payload.get("description"),
            objective=objective,
            is_eligible=bool(payload.get("is_eligible", True)),
            substantial_contribution=bool(payload.get("substantial_contribution", False)),
            dnsh_climate_mitigation=bool(payload.get("dnsh_climate_mitigation", False)),
            dnsh_climate_adaptation=bool(payload.get("dnsh_climate_adaptation", False)),
            dnsh_water_marine=bool(payload.get("dnsh_water_marine", False)),
            dnsh_circular_economy=bool(payload.get("dnsh_circular_economy", False)),
            dnsh_pollution=bool(payload.get("dnsh_pollution", False)),
            dnsh_biodiversity=bool(payload.get("dnsh_biodiversity", False)),
            minimum_safeguards=bool(payload.get("minimum_safeguards", False)),
            turnover_eur=payload.get("turnover_eur"),
            capex_eur=payload.get("capex_eur"),
            opex_eur=payload.get("opex_eur"),
            notes=payload.get("notes"),
            evidence_url=payload.get("evidence_url"),
        )
        activity.status = compute_activity_status(activity)
        self.db.add(activity)
        await self.db.flush()
        return activity

    async def update_activity(
        self, activity_id: UUID, patch: Dict[str, Any],
    ) -> Optional[TaxonomyActivity]:
        stmt = (
            select(TaxonomyActivity)
            .where(TaxonomyActivity.tenant_id == self.tenant_id)
            .where(TaxonomyActivity.id == activity_id)
        )
        result = await self.db.execute(stmt)
        activity = result.scalar_one_or_none()
        if activity is None:
            return None

        allowed = {
            "activity_code", "label", "description", "objective",
            "is_eligible", "substantial_contribution",
            "dnsh_climate_mitigation", "dnsh_climate_adaptation",
            "dnsh_water_marine", "dnsh_circular_economy",
            "dnsh_pollution", "dnsh_biodiversity",
            "minimum_safeguards",
            "turnover_eur", "capex_eur", "opex_eur",
            "notes", "evidence_url",
        }
        for k, v in patch.items():
            if k not in allowed or v is None:
                continue
            if k == "objective":
                try:
                    TaxonomyObjective(v)
                except ValueError:
                    continue
            setattr(activity, k, v)

        activity.status = compute_activity_status(activity)
        activity.updated_at = datetime.now(timezone.utc)
        await self.db.flush()
        return activity

    async def delete_activity(self, activity_id: UUID) -> bool:
        stmt = (
            select(TaxonomyActivity)
            .where(TaxonomyActivity.tenant_id == self.tenant_id)
            .where(TaxonomyActivity.id == activity_id)
        )
        result = await self.db.execute(stmt)
        activity = result.scalar_one_or_none()
        if activity is None:
            return False
        await self.db.delete(activity)
        await self.db.flush()
        return True

    # ── KPIs ───────────────────────────────────────────────────────────────
    async def compute_kpis(self, assessment_id: UUID) -> Dict[str, Any]:
        """
        Compute Turnover, CapEx, OpEx alignment ratios for the assessment.
        Returns share of aligned activities for each financial denominator.
        """
        assess = await self.get_assessment(assessment_id)
        if assess is None:
            return {}

        activities = await self.list_activities(assessment_id)

        def _share(field: str, denom: Optional[Decimal]) -> Dict[str, Any]:
            if not denom or float(denom) == 0:
                return {
                    "eligible_eur": 0.0, "aligned_eur": 0.0,
                    "eligible_pct": 0.0, "aligned_pct": 0.0,
                }
            eligible_sum = sum(
                (float(getattr(a, field) or 0)) for a in activities
                if a.is_eligible
            )
            aligned_sum = sum(
                (float(getattr(a, field) or 0)) for a in activities
                if a.status == "aligned"
            )
            denom_f = float(denom)
            return {
                "eligible_eur": round(eligible_sum, 2),
                "aligned_eur": round(aligned_sum, 2),
                "eligible_pct": round((eligible_sum / denom_f) * 100, 2),
                "aligned_pct": round((aligned_sum / denom_f) * 100, 2),
            }

        return {
            "assessment_id": str(assess.id),
            "year": assess.year,
            "status": assess.status,
            "total_turnover_eur": float(assess.total_turnover_eur) if assess.total_turnover_eur else None,
            "total_capex_eur": float(assess.total_capex_eur) if assess.total_capex_eur else None,
            "total_opex_eur": float(assess.total_opex_eur) if assess.total_opex_eur else None,
            "turnover_kpi": _share("turnover_eur", assess.total_turnover_eur),
            "capex_kpi": _share("capex_eur", assess.total_capex_eur),
            "opex_kpi": _share("opex_eur", assess.total_opex_eur),
            "activity_counts": {
                "total": len(activities),
                "eligible": sum(1 for a in activities if a.is_eligible),
                "aligned": sum(1 for a in activities if a.status == "aligned"),
                "partial": sum(1 for a in activities if a.status == "partial"),
                "not_aligned": sum(1 for a in activities if a.status == "not_aligned"),
                "not_eligible": sum(1 for a in activities if a.status == "not_eligible"),
                "unassessed": sum(1 for a in activities if a.status == "unassessed"),
            },
        }

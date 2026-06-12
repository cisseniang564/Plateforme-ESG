"""
Commute Emissions API — auto-compute Scope 3 Category 7 from HR data.

Endpoints:
  GET    /commute-emissions/defaults     — INSEE/ADEME default assumptions
  POST   /commute-emissions/compute      — calculate emissions from headcount
  POST   /commute-emissions/push-to-entry — persist result as a DataEntry
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Dict, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.data_entry import DataEntry
from app.services.commute_emissions_service import (
    compute_commute_emissions,
    get_defaults_payload,
)


router = APIRouter()


# ───────────────────────────────────────────────────────────────────────────
# Pydantic schemas
# ───────────────────────────────────────────────────────────────────────────

class ComputeRequest(BaseModel):
    headcount: int = Field(gt=0, le=10_000_000)
    geographic_profile: str = Field(default="national_avg",
                                    pattern="^(dense_urban|suburban|rural|national_avg)$")
    distance_km_one_way: Optional[float] = Field(default=None, ge=0, le=500)
    working_days: Optional[int] = Field(default=None, ge=100, le=300)
    teleworking_days_per_week: float = Field(default=0.0, ge=0, le=5)
    modal_split_override: Optional[Dict[str, float]] = None


class PushToEntryRequest(ComputeRequest):
    organization_id: Optional[UUID] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None


# ───────────────────────────────────────────────────────────────────────────
# Endpoints
# ───────────────────────────────────────────────────────────────────────────

@router.get("/defaults")
async def get_defaults(current_user: User = Depends(get_current_user)):
    """Return all default assumptions (modal splits, factors, sources)."""
    return get_defaults_payload()


@router.post("/compute")
async def compute(
    body: ComputeRequest,
    current_user: User = Depends(get_current_user),
):
    """Compute annual Scope 3 Cat. 7 emissions from headcount + assumptions."""
    try:
        result = compute_commute_emissions(
            headcount=body.headcount,
            geographic_profile=body.geographic_profile,
            distance_km_one_way=body.distance_km_one_way,
            working_days=body.working_days,
            teleworking_days_per_week=body.teleworking_days_per_week,
            modal_split_override=body.modal_split_override,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return result.to_dict()


@router.post("/push-to-entry", status_code=201)
async def push_to_data_entry(
    body: PushToEntryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Compute the commute emissions and persist as a DataEntry on the
    "environmental" pillar. Becomes part of the Scope 3 dataset for
    reporting, validation workflow, ESG scoring, etc.
    """
    try:
        result = compute_commute_emissions(
            headcount=body.headcount,
            geographic_profile=body.geographic_profile,
            distance_km_one_way=body.distance_km_one_way,
            working_days=body.working_days,
            teleworking_days_per_week=body.teleworking_days_per_week,
            modal_split_override=body.modal_split_override,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    today = datetime.utcnow().date()
    period_start = body.period_start or date(today.year, 1, 1)
    period_end = body.period_end or date(today.year, 12, 31)

    entry = DataEntry(
        id=uuid4(),
        tenant_id=current_user.tenant_id,
        organization_id=body.organization_id,
        metric_name="scope3_cat7_commuting",
        category="Émissions GES — Scope 3 catégorie 7",
        pillar="environmental",
        period_start=period_start,
        period_end=period_end,
        period_type="annual",
        value_numeric=round(result.annual_tco2e_total, 3),
        unit="tCO2eq",
        data_source="Calculateur automatique ESGflow — INSEE/ADEME",
        collection_method="calculated",
        calculation_method="GHG Protocol activity-based · INSEE 2022 · ADEME BE v23.0",
        verification_status="pending",
        created_by=current_user.id,
        notes=(
            f"Auto-calculé pour {body.headcount} ETP · profil {body.geographic_profile} · "
            f"distance {result.inputs['distance_km_one_way']} km · "
            f"{result.inputs['working_days']} j travaillés · "
            f"{body.teleworking_days_per_week} j télétravail/sem. · "
            f"Détail modes : {', '.join(f'{m.label_fr}={m.annual_kgco2e_total/1000:.1f}t' for m in result.by_mode[:4])}"
        ),
        quality_flags={
            "auto_computed":  True,
            "source_module":  "commute_emissions",
            "computed_at":    datetime.utcnow().isoformat(),
            "inputs":         result.inputs,
        },
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    return {
        "entry_id":          str(entry.id),
        "metric_name":       entry.metric_name,
        "value_numeric":     entry.value_numeric,
        "unit":              entry.unit,
        "period_start":      entry.period_start.isoformat(),
        "period_end":        entry.period_end.isoformat(),
        "compute_result":    result.to_dict(),
    }

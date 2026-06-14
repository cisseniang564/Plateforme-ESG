"""
EU Taxonomy Assessment endpoints — DB-backed CRUD for taxonomy alignment
assessments. Complements the existing /taxonomy reference-data endpoints
(objectives, sectors, reference activities) with persistent per-tenant
storage that replaces the Redis-volatile plan.

Routes (prefix /taxonomy-assess):
  GET    /                                 — List assessments for tenant
  POST   /                                 — Get-or-create assessment for year
  GET    /{assessment_id}                  — Fetch with activities
  PATCH  /{assessment_id}                  — Update denominators/status
  DELETE /{assessment_id}                  — (admin) delete (cascades activities)

  GET    /{assessment_id}/activities       — List activities
  POST   /{assessment_id}/activities       — Create activity
  PATCH  /activities/{activity_id}         — Update activity (recomputes status)
  DELETE /activities/{activity_id}         — Delete activity

  GET    /{assessment_id}/kpis             — Compute Turnover/CapEx/OpEx KPIs
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_user, get_current_tenant_id
from app.models.user import User
from app.services.taxonomy_assessment_service import TaxonomyAssessmentService

router = APIRouter(prefix="/taxonomy-assess", tags=["EU Taxonomy Assessment"])


# ─── Schemas ───────────────────────────────────────────────────────────────
class AssessmentCreate(BaseModel):
    year: int = Field(..., ge=2020, le=2099)


class AssessmentPatch(BaseModel):
    status: Optional[str] = None
    total_turnover_eur: Optional[float] = None
    total_capex_eur: Optional[float] = None
    total_opex_eur: Optional[float] = None
    notes: Optional[str] = None


class ActivityCreate(BaseModel):
    activity_code: Optional[str] = None
    label: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    objective: str = "climate_mitigation"
    is_eligible: bool = True
    substantial_contribution: bool = False
    dnsh_climate_mitigation: bool = False
    dnsh_climate_adaptation: bool = False
    dnsh_water_marine: bool = False
    dnsh_circular_economy: bool = False
    dnsh_pollution: bool = False
    dnsh_biodiversity: bool = False
    minimum_safeguards: bool = False
    turnover_eur: Optional[float] = None
    capex_eur: Optional[float] = None
    opex_eur: Optional[float] = None
    notes: Optional[str] = None
    evidence_url: Optional[str] = None


class ActivityPatch(BaseModel):
    activity_code: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None
    objective: Optional[str] = None
    is_eligible: Optional[bool] = None
    substantial_contribution: Optional[bool] = None
    dnsh_climate_mitigation: Optional[bool] = None
    dnsh_climate_adaptation: Optional[bool] = None
    dnsh_water_marine: Optional[bool] = None
    dnsh_circular_economy: Optional[bool] = None
    dnsh_pollution: Optional[bool] = None
    dnsh_biodiversity: Optional[bool] = None
    minimum_safeguards: Optional[bool] = None
    turnover_eur: Optional[float] = None
    capex_eur: Optional[float] = None
    opex_eur: Optional[float] = None
    notes: Optional[str] = None
    evidence_url: Optional[str] = None


# ─── Serializers ───────────────────────────────────────────────────────────
def _serialize_assess(a) -> Dict[str, Any]:
    return {
        "id": str(a.id),
        "tenant_id": str(a.tenant_id),
        "year": a.year,
        "status": a.status,
        "total_turnover_eur": float(a.total_turnover_eur) if a.total_turnover_eur else None,
        "total_capex_eur": float(a.total_capex_eur) if a.total_capex_eur else None,
        "total_opex_eur": float(a.total_opex_eur) if a.total_opex_eur else None,
        "notes": a.notes,
        "published_at": a.published_at.isoformat() if a.published_at else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


def _serialize_activity(a) -> Dict[str, Any]:
    return {
        "id": str(a.id),
        "assessment_id": str(a.assessment_id),
        "activity_code": a.activity_code,
        "label": a.label,
        "description": a.description,
        "objective": a.objective,
        "is_eligible": a.is_eligible,
        "status": a.status,
        "substantial_contribution": a.substantial_contribution,
        "dnsh_climate_mitigation": a.dnsh_climate_mitigation,
        "dnsh_climate_adaptation": a.dnsh_climate_adaptation,
        "dnsh_water_marine": a.dnsh_water_marine,
        "dnsh_circular_economy": a.dnsh_circular_economy,
        "dnsh_pollution": a.dnsh_pollution,
        "dnsh_biodiversity": a.dnsh_biodiversity,
        "minimum_safeguards": a.minimum_safeguards,
        "turnover_eur": float(a.turnover_eur) if a.turnover_eur else None,
        "capex_eur": float(a.capex_eur) if a.capex_eur else None,
        "opex_eur": float(a.opex_eur) if a.opex_eur else None,
        "notes": a.notes,
        "evidence_url": a.evidence_url,
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
    }


# ─── Assessments ───────────────────────────────────────────────────────────
@router.get("/")
async def list_assessments(
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> List[Dict[str, Any]]:
    svc = TaxonomyAssessmentService(db, tenant_id)
    return [_serialize_assess(a) for a in await svc.list_assessments()]


@router.post("/", status_code=http_status.HTTP_201_CREATED)
async def create_assessment(
    payload: AssessmentCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> Dict[str, Any]:
    svc = TaxonomyAssessmentService(db, tenant_id)
    assess = await svc.get_or_create_assessment(payload.year)
    await db.commit()
    return _serialize_assess(assess)


@router.get("/{assessment_id}")
async def get_assessment(
    assessment_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> Dict[str, Any]:
    svc = TaxonomyAssessmentService(db, tenant_id)
    assess = await svc.get_assessment(assessment_id)
    if assess is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {
        **_serialize_assess(assess),
        "activities": [_serialize_activity(a) for a in assess.activities],
    }


@router.patch("/{assessment_id}")
async def update_assessment(
    assessment_id: UUID,
    payload: AssessmentPatch,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> Dict[str, Any]:
    svc = TaxonomyAssessmentService(db, tenant_id)
    assess = await svc.update_assessment(
        assessment_id, payload.model_dump(exclude_unset=True),
    )
    if assess is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    await db.commit()
    return _serialize_assess(assess)


# ─── Activities ────────────────────────────────────────────────────────────
@router.get("/{assessment_id}/activities")
async def list_activities(
    assessment_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> List[Dict[str, Any]]:
    svc = TaxonomyAssessmentService(db, tenant_id)
    assess = await svc.get_assessment(assessment_id)
    if assess is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return [_serialize_activity(a) for a in await svc.list_activities(assessment_id)]


@router.post("/{assessment_id}/activities", status_code=http_status.HTTP_201_CREATED)
async def create_activity(
    assessment_id: UUID,
    payload: ActivityCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> Dict[str, Any]:
    svc = TaxonomyAssessmentService(db, tenant_id)
    assess = await svc.get_assessment(assessment_id)
    if assess is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    activity = await svc.create_activity(assessment_id, payload.model_dump())
    await db.commit()
    return _serialize_activity(activity)


@router.patch("/activities/{activity_id}")
async def update_activity(
    activity_id: UUID,
    payload: ActivityPatch,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> Dict[str, Any]:
    svc = TaxonomyAssessmentService(db, tenant_id)
    activity = await svc.update_activity(
        activity_id, payload.model_dump(exclude_unset=True),
    )
    if activity is None:
        raise HTTPException(status_code=404, detail="Activity not found")
    await db.commit()
    return _serialize_activity(activity)


@router.delete("/activities/{activity_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
):
    svc = TaxonomyAssessmentService(db, tenant_id)
    ok = await svc.delete_activity(activity_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Activity not found")
    await db.commit()

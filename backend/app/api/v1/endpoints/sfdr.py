"""
SFDR endpoints — Sustainable Finance Disclosure Regulation (EU 2019/2088).

Replaces the previous localStorage-only persistence with proper DB-backed
endpoints for SFDR reports and PAI indicators.

Routes:
  GET    /sfdr/catalog                       — PAI catalog (18 indicators)
  GET    /sfdr/summary?year=YYYY             — Dashboard summary
  GET    /sfdr/reports                       — List reports (filterable by year)
  POST   /sfdr/reports                       — Create or fetch report (idempotent)
  GET    /sfdr/reports/{report_id}           — Fetch one report (with PAIs)
  PATCH  /sfdr/reports/{report_id}           — Update report metadata
  DELETE /sfdr/reports/{report_id}           — Delete report
  GET    /sfdr/reports/{report_id}/pai       — List PAI values for a report
  PUT    /sfdr/reports/{report_id}/pai       — Bulk upsert PAI values
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
from app.services.sfdr_service import SFDRService, PAI_CATALOG, POLICY_TEMPLATES

router = APIRouter(prefix="/sfdr", tags=["SFDR"])


# ─── Schemas ───────────────────────────────────────────────────────────────
class ReportCreate(BaseModel):
    year: int = Field(..., ge=2020, le=2099)
    fund_id: str = Field(..., min_length=1, max_length=64)
    fund_name: str = Field(..., min_length=1, max_length=255)
    article: str = Field(default="article8")


class ReportPatch(BaseModel):
    fund_name: Optional[str] = None
    article: Optional[str] = None
    policy_text: Optional[str] = None
    policy_edited: Optional[bool] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class PAIEntry(BaseModel):
    metric_key: str
    value: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None


class PAIBulkUpsert(BaseModel):
    entries: List[PAIEntry]


# ─── Helpers ───────────────────────────────────────────────────────────────
def _serialize_report(r) -> Dict[str, Any]:
    return {
        "id": str(r.id),
        "tenant_id": str(r.tenant_id),
        "year": r.year,
        "fund_id": r.fund_id,
        "fund_name": r.fund_name,
        "article": r.article,
        "policy_text": r.policy_text,
        "policy_edited": r.policy_edited,
        "status": r.status,
        "published_at": r.published_at.isoformat() if r.published_at else None,
        "notes": r.notes,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


def _serialize_pai(p) -> Dict[str, Any]:
    return {
        "id": str(p.id),
        "report_id": str(p.report_id),
        "metric_key": p.metric_key,
        "pai_number": p.pai_number,
        "value": float(p.value) if p.value is not None else None,
        "unit": p.unit,
        "notes": p.notes,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


# ─── Catalog ───────────────────────────────────────────────────────────────
@router.get("/catalog")
async def get_catalog(
    _user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """Return the canonical PAI catalog + default policy templates."""
    return {
        "pai_catalog": PAI_CATALOG,
        "policy_templates": POLICY_TEMPLATES,
    }


# ─── Summary ───────────────────────────────────────────────────────────────
@router.get("/summary")
async def get_summary(
    year: int = Query(..., ge=2020, le=2099),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> Dict[str, Any]:
    svc = SFDRService(db, tenant_id)
    return await svc.get_summary(year)


# ─── Reports ───────────────────────────────────────────────────────────────
@router.get("/reports")
async def list_reports(
    year: Optional[int] = Query(default=None, ge=2020, le=2099),
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> List[Dict[str, Any]]:
    svc = SFDRService(db, tenant_id)
    reports = await svc.list_reports(year=year)
    return [_serialize_report(r) for r in reports]


@router.post("/reports", status_code=http_status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> Dict[str, Any]:
    svc = SFDRService(db, tenant_id)
    report = await svc.get_or_create_report(
        year=payload.year,
        fund_id=payload.fund_id,
        fund_name=payload.fund_name,
        article=payload.article,
    )
    await db.commit()
    return _serialize_report(report)


@router.get("/reports/{report_id}")
async def get_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> Dict[str, Any]:
    svc = SFDRService(db, tenant_id)
    report = await svc.get_report(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        **_serialize_report(report),
        "pai_values": [_serialize_pai(p) for p in report.pai_values],
    }


@router.patch("/reports/{report_id}")
async def update_report(
    report_id: UUID,
    payload: ReportPatch,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> Dict[str, Any]:
    svc = SFDRService(db, tenant_id)
    report = await svc.update_report(report_id, payload.model_dump(exclude_unset=True))
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.commit()
    return _serialize_report(report)


@router.delete("/reports/{report_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
):
    svc = SFDRService(db, tenant_id)
    ok = await svc.delete_report(report_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.commit()


# ─── PAI values ────────────────────────────────────────────────────────────
@router.get("/reports/{report_id}/pai")
async def list_pai_values(
    report_id: UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> List[Dict[str, Any]]:
    svc = SFDRService(db, tenant_id)
    # Ensure report belongs to tenant
    report = await svc.get_report(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return [_serialize_pai(p) for p in await svc.list_pai_values(report_id)]


@router.put("/reports/{report_id}/pai")
async def bulk_upsert_pai(
    report_id: UUID,
    payload: PAIBulkUpsert,
    db: AsyncSession = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> List[Dict[str, Any]]:
    svc = SFDRService(db, tenant_id)
    report = await svc.get_report(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    pais = await svc.bulk_upsert_pai(
        report_id=report_id,
        entries=[e.model_dump() for e in payload.entries],
    )
    await db.commit()
    return [_serialize_pai(p) for p in pais]

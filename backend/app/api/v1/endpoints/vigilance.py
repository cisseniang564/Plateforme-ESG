"""
Vigilance endpoints — Plan de vigilance (Loi 2017-399) + Sapin 2 alert channel.

Routes:
  GET    /vigilance/summary?year=YYYY     — Dashboard summary
  GET    /vigilance/plans                 — List all plans for tenant
  GET    /vigilance/plan/{year}           — Get or auto-create plan
  PATCH  /vigilance/plan/{year}           — Update plan narrative
  GET    /vigilance/plan/{year}/export.pdf — Download plan as PDF

  GET    /vigilance/risks                 — List risks (filterable)
  POST   /vigilance/risks                 — Create risk
  PATCH  /vigilance/risks/{id}            — Update risk
  DELETE /vigilance/risks/{id}            — Delete risk
  GET    /vigilance/risks/heatmap         — 5×5 severity × likelihood matrix

  GET    /vigilance/actions               — List mitigation actions
  POST   /vigilance/actions               — Create action
  PATCH  /vigilance/actions/{id}          — Update action

  GET    /vigilance/alerts                — List alerts (auth required)
  POST   /vigilance/alerts                — Create alert (auth — internal)
  POST   /vigilance/alerts/public         — Public anonymous report (no auth, rate-limited)
  GET    /vigilance/alerts/case/{number}  — Public case-status lookup (anonymous-friendly)
  PATCH  /vigilance/alerts/{id}           — Update alert (triage / close)
"""
from __future__ import annotations

from datetime import date
from typing import List, Optional, Any, Dict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status, Request
from pydantic import BaseModel, Field, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_user, get_current_tenant_id
from app.models.user import User
from app.services.vigilance_service import VigilanceService

router = APIRouter(prefix="/vigilance", tags=["Vigilance"])


# ─── Pydantic schemas ──────────────────────────────────────────────────────
class PlanPatch(BaseModel):
    status: Optional[str] = None
    risk_mapping_summary: Optional[str] = None
    assessment_procedures: Optional[str] = None
    mitigation_actions: Optional[str] = None
    alert_mechanism: Optional[str] = None
    monitoring_scheme: Optional[str] = None
    covers_subsidiaries: Optional[bool] = None
    covers_suppliers: Optional[bool] = None
    covers_subcontractors: Optional[bool] = None
    stakeholders_consulted: Optional[str] = None
    published_url: Optional[str] = None


class RiskCreate(BaseModel):
    plan_id: Optional[UUID] = None
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: str = Field(..., max_length=30)
    scope: str = Field(..., max_length=30)
    severity: int = Field(..., ge=1, le=5)
    likelihood: int = Field(..., ge=1, le=5)
    residual_severity: Optional[int] = Field(default=None, ge=1, le=5)
    residual_likelihood: Optional[int] = Field(default=None, ge=1, le=5)
    countries: Optional[List[str]] = None
    source_reference: Optional[str] = None
    owner_user_id: Optional[UUID] = None


class RiskPatch(BaseModel):
    plan_id: Optional[UUID] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    scope: Optional[str] = None
    severity: Optional[int] = Field(default=None, ge=1, le=5)
    likelihood: Optional[int] = Field(default=None, ge=1, le=5)
    residual_severity: Optional[int] = Field(default=None, ge=1, le=5)
    residual_likelihood: Optional[int] = Field(default=None, ge=1, le=5)
    countries: Optional[List[str]] = None
    source_reference: Optional[str] = None
    owner_user_id: Optional[UUID] = None


class ActionCreate(BaseModel):
    risk_id: UUID
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = "planned"
    priority: str = "medium"
    deadline: Optional[date] = None
    owner_user_id: Optional[UUID] = None
    budget_eur: Optional[int] = None
    evidence_url: Optional[str] = None


class ActionPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[date] = None
    completed_at: Optional[date] = None
    owner_user_id: Optional[UUID] = None
    budget_eur: Optional[int] = None
    evidence_url: Optional[str] = None


class AlertCreate(BaseModel):
    category: str
    severity: str = "medium"
    subject: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    reporter_name: Optional[str] = None
    reporter_email: Optional[EmailStr] = None
    reporter_role: Optional[str] = None
    country: Optional[str] = None
    location: Optional[str] = None
    organization_concerned: Optional[str] = None
    source: Optional[str] = "web_form"


class PublicAlertCreate(BaseModel):
    """Public endpoint payload — same as AlertCreate but tenant_slug required."""
    tenant_slug: str
    category: str
    severity: str = "medium"
    subject: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=10)
    reporter_name: Optional[str] = None
    reporter_email: Optional[EmailStr] = None
    reporter_role: Optional[str] = None
    country: Optional[str] = None
    location: Optional[str] = None
    organization_concerned: Optional[str] = None


class AlertPatch(BaseModel):
    status: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    closure_notes: Optional[str] = None
    linked_risk_id: Optional[UUID] = None
    severity: Optional[str] = None


# ─── Serialization helpers ──────────────────────────────────────────────────
def _serialize_plan(p) -> Dict[str, Any]:
    return {
        "id": str(p.id),
        "year": p.year,
        "status": p.status,
        "risk_mapping_summary": p.risk_mapping_summary,
        "assessment_procedures": p.assessment_procedures,
        "mitigation_actions": p.mitigation_actions,
        "alert_mechanism": p.alert_mechanism,
        "monitoring_scheme": p.monitoring_scheme,
        "covers_subsidiaries": p.covers_subsidiaries,
        "covers_suppliers": p.covers_suppliers,
        "covers_subcontractors": p.covers_subcontractors,
        "stakeholders_consulted": p.stakeholders_consulted,
        "published_at": p.published_at.isoformat() if p.published_at else None,
        "published_url": p.published_url,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "updated_at": p.updated_at.isoformat() if p.updated_at else None,
    }


def _serialize_risk(r) -> Dict[str, Any]:
    return {
        "id": str(r.id),
        "plan_id": str(r.plan_id) if r.plan_id else None,
        "title": r.title,
        "description": r.description,
        "category": r.category,
        "scope": r.scope,
        "severity": r.severity,
        "likelihood": r.likelihood,
        "gross_score": r.severity * r.likelihood,
        "residual_severity": r.residual_severity,
        "residual_likelihood": r.residual_likelihood,
        "residual_score": (
            r.residual_severity * r.residual_likelihood
            if r.residual_severity and r.residual_likelihood else None
        ),
        "countries": r.countries or [],
        "source_reference": r.source_reference,
        "owner_user_id": str(r.owner_user_id) if r.owner_user_id else None,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _serialize_action(a) -> Dict[str, Any]:
    return {
        "id": str(a.id),
        "risk_id": str(a.risk_id),
        "title": a.title,
        "description": a.description,
        "status": a.status,
        "priority": a.priority,
        "deadline": a.deadline.isoformat() if a.deadline else None,
        "completed_at": a.completed_at.isoformat() if a.completed_at else None,
        "owner_user_id": str(a.owner_user_id) if a.owner_user_id else None,
        "budget_eur": a.budget_eur,
        "evidence_url": a.evidence_url,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _serialize_alert(a, include_reporter: bool = True) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        "id": str(a.id),
        "case_number": a.case_number,
        "category": a.category,
        "severity": a.severity,
        "subject": a.subject,
        "description": a.description,
        "country": a.country,
        "location": a.location,
        "organization_concerned": a.organization_concerned,
        "status": a.status,
        "source": a.source,
        "is_anonymous": a.is_anonymous,
        "assigned_to_id": str(a.assigned_to_id) if a.assigned_to_id else None,
        "linked_risk_id": str(a.linked_risk_id) if a.linked_risk_id else None,
        "closed_at": a.closed_at.isoformat() if a.closed_at else None,
        "closure_notes": a.closure_notes,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }
    if include_reporter and not a.is_anonymous:
        out["reporter_name"] = a.reporter_name
        out["reporter_email"] = a.reporter_email
        out["reporter_role"] = a.reporter_role
    return out


# ─── Plan endpoints ────────────────────────────────────────────────────────
@router.get("/summary", summary="Dashboard de conformité Vigilance")
async def get_summary(
    year: Optional[int] = Query(None, description="Année (défaut: année courante)"),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    return await service.compliance_summary(year=year)


@router.get("/plans", summary="Lister les plans de vigilance")
async def list_plans(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    plans = await service.list_plans()
    return [_serialize_plan(p) for p in plans]


@router.get("/plan/{year}", summary="Récupérer/créer un plan annuel")
async def get_plan(
    year: int,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    plan = await service.get_or_create_plan(year)
    return _serialize_plan(plan)


@router.patch("/plan/{year}", summary="Modifier un plan annuel")
async def patch_plan(
    year: int,
    body: PlanPatch,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    plan = await service.update_plan(year, body.model_dump(exclude_none=True))
    return _serialize_plan(plan)


@router.get("/plan/{year}/export.pdf", summary="Export PDF du Plan de vigilance")
async def export_plan_pdf(
    year: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a PDF version of the Plan de vigilance for *year*."""
    from fastapi.responses import StreamingResponse
    from app.services.vigilance_pdf_service import generate_vigilance_pdf

    service = VigilanceService(db, current_user.tenant_id)
    plan = await service.get_or_create_plan(year)
    risks = await service.list_risks(plan_id=plan.id)
    actions = []
    for r in risks:
        actions.extend(await service.list_actions(risk_id=r.id))
    alerts = await service.list_alerts()

    pdf_bytes = generate_vigilance_pdf(plan, risks, actions, alerts)

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Plan_vigilance_{year}.pdf"'},
    )


# ─── Risk endpoints ────────────────────────────────────────────────────────
@router.get("/risks", summary="Lister les risques")
async def list_risks(
    plan_id: Optional[UUID] = None,
    category: Optional[str] = None,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    risks = await service.list_risks(plan_id=plan_id, category=category)
    return [_serialize_risk(r) for r in risks]


@router.get("/risks/heatmap", summary="Matrice 5×5 sévérité × probabilité")
async def risks_heatmap(
    plan_id: Optional[UUID] = None,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    return await service.risk_heatmap(plan_id=plan_id)


@router.post("/risks", summary="Créer un risque", status_code=http_status.HTTP_201_CREATED)
async def create_risk(
    body: RiskCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    risk = await service.create_risk(body.model_dump(exclude_none=True))
    return _serialize_risk(risk)


@router.patch("/risks/{risk_id}", summary="Modifier un risque")
async def patch_risk(
    risk_id: UUID,
    body: RiskPatch,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    risk = await service.update_risk(risk_id, body.model_dump(exclude_none=True))
    if risk is None:
        raise HTTPException(status_code=404, detail="Risk not found")
    return _serialize_risk(risk)


@router.delete("/risks/{risk_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_risk(
    risk_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    deleted = await service.delete_risk(risk_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Risk not found")
    return None


# ─── Action endpoints ──────────────────────────────────────────────────────
@router.get("/actions", summary="Lister les actions d'atténuation")
async def list_actions(
    risk_id: Optional[UUID] = None,
    status: Optional[str] = None,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    actions = await service.list_actions(risk_id=risk_id, status=status)
    return [_serialize_action(a) for a in actions]


@router.post("/actions", summary="Créer une action", status_code=http_status.HTTP_201_CREATED)
async def create_action(
    body: ActionCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    action = await service.create_action(body.model_dump(exclude_none=True))
    return _serialize_action(action)


@router.patch("/actions/{action_id}", summary="Modifier une action")
async def patch_action(
    action_id: UUID,
    body: ActionPatch,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    action = await service.update_action(action_id, body.model_dump(exclude_none=True))
    if action is None:
        raise HTTPException(status_code=404, detail="Action not found")
    return _serialize_action(action)


# ─── Alert endpoints ───────────────────────────────────────────────────────
@router.get("/alerts", summary="Lister les alertes (auth requis)")
async def list_alerts(
    status: Optional[str] = None,
    category: Optional[str] = None,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    alerts = await service.list_alerts(status=status, category=category)
    return [_serialize_alert(a, include_reporter=True) for a in alerts]


@router.post("/alerts", summary="Créer une alerte (interne, auth requis)",
             status_code=http_status.HTTP_201_CREATED)
async def create_alert_internal(
    body: AlertCreate,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    alert = await service.create_alert(body.model_dump(exclude_none=True))
    return _serialize_alert(alert, include_reporter=True)


@router.patch("/alerts/{alert_id}", summary="Trier / modifier une alerte")
async def patch_alert(
    alert_id: UUID,
    body: AlertPatch,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    service = VigilanceService(db, tenant_id)
    alert = await service.update_alert(alert_id, body.model_dump(exclude_none=True))
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _serialize_alert(alert, include_reporter=True)


# ─── Public endpoints (no auth) ────────────────────────────────────────────
public_router = APIRouter(prefix="/vigilance-public", tags=["Vigilance (Public)"])


@public_router.post("/alerts", summary="Signalement public anonyme (sans auth)",
                    status_code=http_status.HTTP_201_CREATED)
async def create_alert_public(
    request: Request,
    body: PublicAlertCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint to submit a whistleblowing report without authentication.

    The reporter provides the company's ``tenant_slug`` (visible on the public
    alert page) and the report payload. Anonymous by default — if email/name
    is provided, the reporter can be contacted for follow-up.

    Rate-limited at the nginx/middleware layer (10 req/min per IP).

    Returns: the generated case_number so the reporter can later check status.
    """
    from sqlalchemy import select
    from app.models.tenant import Tenant

    # Resolve tenant_slug → tenant_id
    stmt = select(Tenant).where(Tenant.slug == body.tenant_slug).limit(1)
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")

    service = VigilanceService(db, tenant.id)
    payload = body.model_dump(exclude={"tenant_slug"}, exclude_none=True)
    payload["source"] = "public_form"
    alert = await service.create_alert(payload)

    # Return only what the reporter needs (case number + status)
    return {
        "case_number": alert.case_number,
        "status": alert.status,
        "message": (
            "Votre signalement a été enregistré. Conservez précieusement ce "
            "numéro de dossier pour suivre son traitement."
        ),
    }


@public_router.get("/alerts/case/{case_number}",
                   summary="Suivi public d'un signalement (anonyme)")
async def get_alert_public(
    case_number: str,
    tenant_slug: str = Query(..., description="Identifiant public du tenant"),
    db: AsyncSession = Depends(get_db),
):
    """
    Public case-status lookup. Used by the reporter to follow their case.

    Returns minimal information — status, dates, no reporter identity.
    """
    from sqlalchemy import select
    from app.models.tenant import Tenant

    stmt = select(Tenant).where(Tenant.slug == tenant_slug).limit(1)
    result = await db.execute(stmt)
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")

    service = VigilanceService(db, tenant.id)
    alert = await service.get_alert_by_case_number(case_number)
    if alert is None:
        raise HTTPException(status_code=404, detail="Case not found")

    return {
        "case_number": alert.case_number,
        "status": alert.status,
        "category": alert.category,
        "subject": alert.subject,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
        "closed_at": alert.closed_at.isoformat() if alert.closed_at else None,
        "has_been_assigned": alert.assigned_to_id is not None,
    }

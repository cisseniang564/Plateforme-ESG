"""
Supply Chain ESG API — supplier management, ESG scoring & due diligence.
PostgreSQL-backed (via SupplyChainService). Redis is no longer used.
"""
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.config import settings
from app.services.supply_chain_service import (
    PORTAL_VALID_DAYS,
        SupplyChainService,
    risk_level_from_score,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Pydantic models ──────────────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str
    country: str = "France"
    category: str = "Services"
    contact_email: str = ""
    employees: int = 0
    spend_k_eur: float = 0.0   # k€ annuel


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    country: Optional[str] = None
    category: Optional[str] = None
    contact_email: Optional[str] = None
    employees: Optional[int] = None
    spend_k_eur: Optional[float] = None
    risk_level: Optional[str] = None
    status: Optional[str] = None
    global_score: Optional[float] = None
    env_score: Optional[float] = None
    social_score: Optional[float] = None
    gov_score: Optional[float] = None
    flags: Optional[List[str]] = None


class QuestionnaireRequest(BaseModel):
    recipient_email: Optional[str] = None


class AssessmentSubmission(BaseModel):
    """Évaluation saisie par l'utilisateur (sans passer par le portail fournisseur)."""
    answers: Dict[str, Any]


class PortalSubmission(BaseModel):
    answers: Dict[str, Any]
    supplier_name: str = ""
    contact_name: str = ""


# ─── Helper functions ─────────────────────────────────────────────────────────

def _get_questionnaire_questions() -> List[Dict]:
    return [
        # Environnement
        {"id": "scope1", "section": "Environnement", "question": "Émissions GES Scope 1 (tCO₂e/an)", "type": "number", "unit": "tCO₂e", "required": True, "help": "Émissions directes de vos installations et véhicules"},
        {"id": "scope2", "section": "Environnement", "question": "Émissions GES Scope 2 (tCO₂e/an)", "type": "number", "unit": "tCO₂e", "required": True, "help": "Émissions liées à votre consommation d'électricité"},
        {"id": "renewable_pct", "section": "Environnement", "question": "Part d'énergie renouvelable (%)", "type": "number", "unit": "%", "required": False, "help": "% de votre énergie issue de sources renouvelables"},
        {"id": "water_m3", "section": "Environnement", "question": "Consommation d'eau (m³/an)", "type": "number", "unit": "m³", "required": False, "help": "Consommation totale d'eau de vos sites"},
        {"id": "recycling_pct", "section": "Environnement", "question": "Taux de recyclage des déchets (%)", "type": "number", "unit": "%", "required": False, "help": "% de vos déchets recyclés ou valorisés"},
        # Social
        {"id": "headcount", "section": "Social", "question": "Effectif total (ETP)", "type": "number", "unit": "ETP", "required": True, "help": "Nombre de salariés en équivalent temps plein"},
        {"id": "women_pct", "section": "Social", "question": "Part des femmes dans l'effectif (%)", "type": "number", "unit": "%", "required": False, "help": "% de femmes dans votre effectif total"},
        {"id": "accident_rate", "section": "Social", "question": "Taux de fréquence des accidents (pour 1M heures)", "type": "number", "unit": "TF", "required": False, "help": "Nombre d'accidents avec arrêt pour 1 million d'heures travaillées"},
        {"id": "training_hours", "section": "Social", "question": "Heures de formation par salarié/an", "type": "number", "unit": "h", "required": False, "help": "Moyenne d'heures de formation par collaborateur"},
        {"id": "turnover_pct", "section": "Social", "question": "Taux de turnover (%)", "type": "number", "unit": "%", "required": False, "help": "% du personnel ayant quitté l'entreprise sur l'année"},
        # Gouvernance
        {"id": "anticorruption", "section": "Gouvernance", "question": "Politique anti-corruption formalisée", "type": "boolean", "unit": "", "required": True, "help": "Avez-vous une politique anti-corruption documentée ?"},
        {"id": "supplier_code", "section": "Gouvernance", "question": "Code de conduite fournisseurs", "type": "boolean", "unit": "", "required": False, "help": "Avez-vous un code de conduite que vos fournisseurs doivent signer ?"},
        {"id": "iso14001", "section": "Gouvernance", "question": "Certification ISO 14001 ou équivalente", "type": "boolean", "unit": "", "required": False, "help": "Êtes-vous certifié ISO 14001 (management environnemental) ?"},
        {"id": "compliance_pct", "section": "Gouvernance", "question": "Personnel formé compliance/éthique (%)", "type": "number", "unit": "%", "required": False, "help": "% de votre personnel ayant reçu une formation éthique"},
        {"id": "incidents", "section": "Gouvernance", "question": "Incidents réglementaires majeurs (derniers 2 ans)", "type": "select", "options": ["0", "1", "2", "3 ou plus"], "unit": "", "required": False, "help": "Nombre d'infractions réglementaires significatives"},
    ]


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/suppliers", response_model=List[Dict[str, Any]])
async def list_suppliers(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    risk_level: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List suppliers for the tenant."""
    svc = SupplyChainService(db)
    suppliers = await svc.get_suppliers(UUID(str(current_user.tenant_id)))

    # Filters
    if risk_level:
        suppliers = [s for s in suppliers if s.risk_level == risk_level]
    if category:
        suppliers = [s for s in suppliers if s.category == category]

    # Pagination
    start = (page - 1) * page_size
    page_items = suppliers[start: start + page_size]

    return [_supplier_to_dict(s) for s in page_items]


@router.get("/dashboard", response_model=Dict[str, Any])
async def get_supply_chain_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return supply chain KPIs and risk distribution."""
    svc = SupplyChainService(db)
    suppliers = await svc.get_suppliers(UUID(str(current_user.tenant_id)))

    total = len(suppliers)
    evaluated = sum(1 for s in suppliers if s.status == "active")
    critical = sum(1 for s in suppliers if s.risk_level == "critical")
    high = sum(1 for s in suppliers if s.risk_level == "high")
    scored = [s for s in suppliers if s.global_score and s.global_score > 0]
    avg_score = (
        round(sum(s.global_score for s in scored) / len(scored), 1) if scored else None
    )

    risk_dist = [
        {"level": "critical", "count": critical},
        {"level": "high",     "count": high},
        {"level": "medium",   "count": sum(1 for s in suppliers if s.risk_level == "medium")},
        {"level": "low",      "count": sum(1 for s in suppliers if s.risk_level == "low")},
    ]

    return {
        "total_suppliers": total,
        "evaluated": evaluated,
        "critical_risk": critical,
        "high_risk": high,
        "avg_esg_score": avg_score,
        "risk_distribution": risk_dist,
    }


@router.post("/suppliers", status_code=201)
async def create_supplier(
    payload: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new supplier record."""
    svc = SupplyChainService(db)
    supplier = await svc.create_supplier(
        tenant_id=UUID(str(current_user.tenant_id)),
        data={
            "name": payload.name,
            "country": payload.country,
            "category": payload.category,
            "contact_email": payload.contact_email,
            "employees": payload.employees,
            "spend_k_eur": payload.spend_k_eur,
            "risk_level": "medium",
            "status": "pending",
            "global_score": 0.0,
            "env_score": 0.0,
            "social_score": 0.0,
            "gov_score": 0.0,
            "flags": [],
        },
    )
    return _supplier_to_dict(supplier)


@router.put("/suppliers/{supplier_id}")
async def update_supplier(
    supplier_id: str,
    payload: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing supplier."""
    svc = SupplyChainService(db)
    update_data = payload.model_dump(exclude_none=True)
    if "global_score" in update_data:
        update_data["last_scored_at"] = datetime.utcnow()
    supplier = await svc.update_supplier(
        tenant_id=UUID(str(current_user.tenant_id)),
        supplier_id=UUID(supplier_id),
        data=update_data,
    )
    if supplier is None:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")
    return _supplier_to_dict(supplier)


@router.delete("/suppliers/{supplier_id}", status_code=204)
async def delete_supplier(
    supplier_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a supplier."""
    svc = SupplyChainService(db)
    deleted = await svc.delete_supplier(
        tenant_id=UUID(str(current_user.tenant_id)),
        supplier_id=UUID(supplier_id),
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")


@router.post("/suppliers/{supplier_id}/questionnaire", status_code=201)
async def send_questionnaire(
    supplier_id: str,
    payload: QuestionnaireRequest = QuestionnaireRequest(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a portal token for a supplier and optionally send an email invitation."""
    svc = SupplyChainService(db)
    tenant_id = UUID(str(current_user.tenant_id))

    try:
        token = await svc.generate_portal_token(
            tenant_id=tenant_id,
            supplier_id=UUID(supplier_id),
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")

    # Mark supplier as pending questionnaire
    supplier = await svc.update_supplier(
        tenant_id=tenant_id,
        supplier_id=UUID(supplier_id),
        data={"status": "pending"},
    )

    portal_url = f"{settings.APP_URL.rstrip('/')}/supplier-portal/{token}"

    recipient = (payload.recipient_email or (supplier.contact_email if supplier else "") or "").strip()
    email_sent = False
    if recipient:
        try:
            from app.tasks.email_tasks import send_supplier_questionnaire_email
            tenant_name = None
            try:
                from sqlalchemy import select
                from app.models.tenant import Tenant
                tenant_name = (
                    await db.execute(select(Tenant.name).where(Tenant.id == tenant_id))
                ).scalar_one_or_none()
            except Exception:  # noqa: BLE001  (le nom est cosmétique : on envoie quand même)
                logger.warning("Could not read tenant name for questionnaire email", exc_info=True)
            send_supplier_questionnaire_email.delay(
                email=recipient,
                requester_company=tenant_name or "Une entreprise cliente",
                supplier_name=supplier.name if supplier else "",
                portal_url=portal_url,
            )
            email_sent = True
        except Exception as e:  # noqa: BLE001
            logger.warning("Could not queue questionnaire email to %s: %s", recipient, e)

    return {
        "status": "sent" if email_sent else "link_generated",
        "email_sent": email_sent,
        "supplier_id": supplier_id,
        "recipient": recipient,
        "sent_at": datetime.utcnow().isoformat(),
        "portal_url": portal_url,
        "valid_days": PORTAL_VALID_DAYS,
    }


@router.post("/suppliers/{supplier_id}/assessment")
async def save_assessment(
    supplier_id: str,
    payload: AssessmentSubmission,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Enregistre une évaluation saisie en interne et en calcule les scores."""
    svc = SupplyChainService(db)
    missing = svc.missing_required(payload.answers)
    if missing:
        raise HTTPException(
            status_code=422,
            detail={"message": "Questions obligatoires sans réponse", "missing": missing},
        )
    scores = svc.compute_esg_score(payload.answers)
    now = datetime.utcnow()
    supplier = await svc.update_supplier(
        tenant_id=UUID(str(current_user.tenant_id)),
        supplier_id=UUID(supplier_id),
        data={
            "questionnaire_data": payload.answers,
            "questionnaire_completed_at": now,
            "last_scored_at": now,
            "status": "active",
            "global_score": scores["global_score"],
            "env_score": scores["env_score"],
            "social_score": scores["social_score"],
            "gov_score": scores["gov_score"],
            "risk_level": risk_level_from_score(scores["global_score"]),
        },
    )
    if supplier is None:
        raise HTTPException(status_code=404, detail="Fournisseur introuvable")
    return {"supplier": _supplier_to_dict(supplier), "scores": scores}


# ─── Questionnaire catalog ────────────────────────────────────────────────────

@router.get("/questionnaire/questions", response_model=List[Dict[str, Any]])
async def get_questionnaire_questions(
    current_user: User = Depends(get_current_user),
):
    """Return the standard ESG supplier questionnaire questions."""
    return _get_questionnaire_questions()


# ─── Public portal endpoints (no auth required) ───────────────────────────────

@router.get("/portal/{token}")
async def get_portal(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — get questionnaire form for a supplier token."""
    svc = SupplyChainService(db)
    supplier = await svc.get_by_portal_token(token)
    if not supplier:
        raise HTTPException(status_code=404, detail="Lien invalide ou expiré (90 jours)")
    return {
        "supplier_name": supplier.name,
        "supplier_id": str(supplier.id),
        "already_completed": supplier.questionnaire_completed_at is not None,
        "questions": _get_questionnaire_questions(),
        "token": token,
    }


@router.post("/portal/{token}/submit")
async def submit_portal(
    token: str,
    payload: PortalSubmission,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — submit questionnaire answers from supplier."""
    svc = SupplyChainService(db)
    supplier = await svc.get_by_portal_token(token)
    if not supplier:
        raise HTTPException(status_code=404, detail="Lien invalide ou expiré")

    missing = svc.missing_required(payload.answers)
    if missing:
        raise HTTPException(
            status_code=422,
            detail={"message": "Questions obligatoires sans réponse", "missing": missing},
        )

    scores = svc.compute_esg_score(payload.answers)

    await svc.update_supplier(
        tenant_id=supplier.tenant_id,
        supplier_id=supplier.id,
        data={
            "questionnaire_data": payload.answers,
            "questionnaire_completed_at": datetime.utcnow(),
            "last_scored_at": datetime.utcnow(),
            "status": "active",
            "global_score": scores["global_score"],
            "env_score": scores["env_score"],
            "social_score": scores["social_score"],
            "gov_score": scores["gov_score"],
            # Map textual risk to risk_level field
            "risk_level": _risk_label_to_level(scores["risk"]),
            # Invalidate token after use
            "portal_token": None,
            "portal_token_expires_at": None,
        },
    )

    return {"status": "submitted", "scores": scores, "supplier_name": supplier.name}


# ─── Private helpers ──────────────────────────────────────────────────────────

def _level_to_risk_label(level: str | None, fallback_score: float | None = None) -> str:
    """Convert DB risk_level (low/medium/high/critical) to the French label
    the frontend ``RiskLevel`` enum expects. Falls back to score-derived
    bucketing if level is missing."""
    if level:
        mapping = {
            "low": "Faible",
            "medium": "Moyen",
            "high": "Élevé",
            "critical": "Critique",
        }
        normalised = mapping.get(level.lower().strip())
        if normalised:
            return normalised
    # Fallback from global_score
    if fallback_score is not None:
        return _level_to_risk_label(risk_level_from_score(float(fallback_score)))
    return "Moyen"


def _status_to_eval_label(status: str | None, last_scored_at, global_score) -> str:
    """Convert DB status to the French ``EvalStatus`` the UI expects.

    A supplier is ``Évalué`` if it has a global_score or a last_scored_at
    timestamp; ``En cours`` if a questionnaire was sent but not finalised;
    ``Refus`` if explicitly rejected; ``Non évalué`` otherwise.
    """
    if last_scored_at is not None:
        return "Évalué"
    if status:
        s = status.lower().strip()
        if s in ("refused", "rejected", "refus"):
            return "Refus"
        if s in ("pending", "in_progress", "en_cours", "questionnaire_sent"):
            return "En cours"
    if last_scored_at is not None or (global_score is not None and float(global_score) > 0):
        return "Évalué"
    return "Non évalué"


def _supplier_to_dict(s) -> Dict[str, Any]:
    """Serialize a Supplier ORM instance to a plain dict for API responses."""
    from datetime import timezone
    expires = s.portal_token_expires_at
    link_active = bool(
        s.portal_token and expires is not None
        and (expires if expires.tzinfo else expires.replace(tzinfo=timezone.utc)) > datetime.now(timezone.utc)
    )
    risk_fr   = _level_to_risk_label(s.risk_level, s.global_score)
    status_fr = _status_to_eval_label(s.status, s.last_scored_at, s.global_score)
    if status_fr == "En cours" and not link_active:
        status_fr = "Non évalué"  # aucun questionnaire réellement en attente
    return {
        "id": str(s.id),
        "tenant_id": str(s.tenant_id),
        "name": s.name,
        "country": s.country,
        "category": s.category,
        "contact_email": s.contact_email,
        "website": s.website,
        "employees": s.employees,
        "annual_revenue_k_eur": float(s.annual_revenue_k_eur) if s.annual_revenue_k_eur is not None else None,
        "spend_k_eur": float(s.spend_k_eur) if s.spend_k_eur is not None else None,
        # Raw DB values
        "risk_level": s.risk_level,
        # French labels the frontend RiskLevel/EvalStatus enums expect
        "risk":   risk_fr,
        "status": status_fr,
        # Convenience aliases consumed by the SupplyChainESG.tsx mapper
        "spend":         float(s.spend_k_eur) if s.spend_k_eur is not None else 0,
        "global_score":  s.global_score,
        "env_score":     s.env_score,
        "social_score":  s.social_score,
        "gov_score":     s.gov_score,
        "flags":         s.flags or [],
        "questionnaire_data": s.questionnaire_data,
        "portal_token": s.portal_token,
        "questionnaire_link_active": link_active,
        "questionnaire_completed": s.questionnaire_completed_at is not None,
        "portal_token_expires_at": s.portal_token_expires_at.isoformat() if s.portal_token_expires_at else None,
        "questionnaire_completed_at": s.questionnaire_completed_at.isoformat() if s.questionnaire_completed_at else None,
        "last_scored_at": s.last_scored_at.isoformat() if s.last_scored_at else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


def _risk_label_to_level(label: str) -> str:
    """Convert French textual risk label to DB risk_level value."""
    mapping = {
        "Faible": "low",
        "Moyen": "medium",
        "Élevé": "high",
        "Critique": "critical",
    }
    return mapping.get(label, "medium")

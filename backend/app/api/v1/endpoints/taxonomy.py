"""EU Taxonomy Regulation 2020/852 - Alignment assessment endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from datetime import datetime
import json
import logging

from app.dependencies import get_current_user
from app.models.user import User
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/taxonomy", tags=["EU Taxonomy"])


def _get_redis():
    try:
        import redis as _redis
        redis_url = str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0"
        return _redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
    except Exception as e:
        logger.warning("Taxonomy: Redis unavailable — %s", e)
        return None

# ─── Static EU Taxonomy Reference Data ───────────────────────────────────────

OBJECTIVES = [
    {"id": "mitigation", "code": "1", "name": "Atténuation du changement climatique",
     "description": "Activités contribuant à la neutralité carbone d'ici 2050"},
    {"id": "adaptation", "code": "2", "name": "Adaptation au changement climatique",
     "description": "Réduction de l'exposition aux risques climatiques actuels et futurs"},
    {"id": "water", "code": "3", "name": "Utilisation durable de l'eau et des ressources marines",
     "description": "Protection et restauration des écosystèmes aquatiques"},
    {"id": "circular", "code": "4", "name": "Transition vers une économie circulaire",
     "description": "Prévention des déchets, réparation, recyclage et réutilisation"},
    {"id": "pollution", "code": "5", "name": "Prévention et contrôle de la pollution",
     "description": "Réduction des émissions polluantes dans l'air, l'eau et les sols"},
    {"id": "biodiversity", "code": "6", "name": "Protection et restauration de la biodiversité",
     "description": "Conservation des écosystèmes, habitats et espèces"},
]

SECTORS = [
    {"id": "energie", "name": "Énergie"},
    {"id": "transport", "name": "Transport"},
    {"id": "construction", "name": "Construction & Immobilier"},
    {"id": "industrie", "name": "Industrie manufacturière"},
    {"id": "agriculture", "name": "Agriculture & Forêts"},
    {"id": "tic", "name": "Technologies de l'information"},
    {"id": "eau", "name": "Eau & Assainissement"},
    {"id": "finance", "name": "Finance & Assurance"},
]

REFERENCE_ACTIVITIES = [
    {
        "id": "act-001", "nace": "D35.11",
        "name": "Production d'électricité à partir de l'énergie solaire",
        "sector": "energie", "objective": "mitigation",
        "threshold": "Émissions de cycle de vie < 100 gCO2e/kWh",
        "dnsh_summary": "Pas d'impact significatif sur biodiversité, eau ou déchets",
        "eligible": True,
    },
    {
        "id": "act-002", "nace": "D35.11",
        "name": "Production d'électricité éolienne",
        "sector": "energie", "objective": "mitigation",
        "threshold": "Émissions de cycle de vie < 100 gCO2e/kWh",
        "dnsh_summary": "Évaluation d'impact faune / avifaune requise",
        "eligible": True,
    },
    {
        "id": "act-003", "nace": "H49.10",
        "name": "Transport ferroviaire de passagers",
        "sector": "transport", "objective": "mitigation",
        "threshold": "Émissions directes < 50 gCO2e/pkm",
        "dnsh_summary": "Infrastructure conforme aux normes bruit UE",
        "eligible": True,
    },
    {
        "id": "act-004", "nace": "F41.1",
        "name": "Construction de nouveaux bâtiments",
        "sector": "construction", "objective": "mitigation",
        "threshold": "Demande énergie primaire (PED) ≤ 10 % au-dessus NZEB",
        "dnsh_summary": "Pas d'utilisation de substances nocives, gestion des eaux pluviales",
        "eligible": True,
    },
    {
        "id": "act-005", "nace": "F43.29",
        "name": "Rénovation énergétique de bâtiments",
        "sector": "construction", "objective": "mitigation",
        "threshold": "Réduction consommation énergie ≥ 30 % ou conforme Deep Renovation",
        "dnsh_summary": "Pas de déchets dangereux non traités",
        "eligible": True,
    },
    {
        "id": "act-006", "nace": "E38.11",
        "name": "Collecte et valorisation des déchets",
        "sector": "industrie", "objective": "circular",
        "threshold": "Taux de valorisation matière ≥ 70 % en masse",
        "dnsh_summary": "Pas d'incinération sans récupération d'énergie",
        "eligible": True,
    },
    {
        "id": "act-007", "nace": "A01.11",
        "name": "Agriculture biologique et régénératrice",
        "sector": "agriculture", "objective": "biodiversity",
        "threshold": "Certification agriculture biologique ou HVE",
        "dnsh_summary": "Pas d'utilisation de pesticides classés PBT/vPvB",
        "eligible": True,
    },
    {
        "id": "act-008", "nace": "C24.10",
        "name": "Production d'acier bas carbone",
        "sector": "industrie", "objective": "mitigation",
        "threshold": "Émissions < 0,301 tCO2e/t d'acier brut (FER électrique)",
        "dnsh_summary": "Gestion stricte des eaux de refroidissement",
        "eligible": True,
    },
    {
        "id": "act-009", "nace": "E36.00",
        "name": "Collecte, traitement et distribution d'eau",
        "sector": "eau", "objective": "water",
        "threshold": "Pertes réseau ≤ 15 % ou réduction de 20 % sur 5 ans",
        "dnsh_summary": "Bonne état des masses d'eau selon DCE",
        "eligible": True,
    },
    {
        "id": "act-010", "nace": "J62.01",
        "name": "Data centers et cloud computing efficaces",
        "sector": "tic", "objective": "mitigation",
        "threshold": "PUE ≤ 1,5 (existant) ou ≤ 1,2 (nouveaux)",
        "dnsh_summary": "Réfrigérants à faible GWP, plan de gestion déchets électroniques",
        "eligible": True,
    },
]


# ─── Schemas ─────────────────────────────────────────────────────────────────

class ActivityAssessment(BaseModel):
    activity_id: str
    substantial_contribution: bool
    dnsh_passed: bool
    min_safeguards: bool
    capex_eligible: Optional[float] = None     # M€
    opex_eligible: Optional[float] = None      # M€
    turnover_eligible: Optional[float] = None  # M€
    notes: Optional[str] = None


class TaxonomyReportRequest(BaseModel):
    assessments: List[ActivityAssessment]
    reporting_year: int = 2024


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/objectives")
async def list_objectives(current_user: User = Depends(get_current_user)):
    """List the 6 EU Taxonomy environmental objectives."""
    return {"objectives": OBJECTIVES}


@router.get("/sectors")
async def list_sectors(current_user: User = Depends(get_current_user)):
    """List eligible economic sectors."""
    return {"sectors": SECTORS}


@router.get("/activities")
async def list_activities(
    sector: Optional[str] = None,
    objective: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """List reference economic activities from the EU Taxonomy."""
    activities = REFERENCE_ACTIVITIES
    if sector:
        activities = [a for a in activities if a["sector"] == sector]
    if objective:
        activities = [a for a in activities if a["objective"] == objective]
    return {"activities": activities, "total": len(activities)}


@router.get("/activities/{activity_id}")
async def get_activity(
    activity_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get technical screening criteria for a specific activity."""
    activity = next((a for a in REFERENCE_ACTIVITIES if a["id"] == activity_id), None)
    if not activity:
        raise HTTPException(status_code=404, detail="Activité non trouvée")
    return activity


@router.post("/assess")
async def assess_alignment(
    request: TaxonomyReportRequest,
    current_user: User = Depends(get_current_user),
):
    """Calculate taxonomy alignment from user assessments."""
    results = []
    total_capex = 0.0
    aligned_capex = 0.0
    total_turnover = 0.0
    aligned_turnover = 0.0

    for assessment in request.assessments:
        activity = next((a for a in REFERENCE_ACTIVITIES if a["id"] == assessment.activity_id), None)
        if not activity:
            continue

        is_aligned = (
            assessment.substantial_contribution
            and assessment.dnsh_passed
            and assessment.min_safeguards
        )
        is_eligible = assessment.substantial_contribution

        capex = assessment.capex_eligible or 0.0
        turnover = assessment.turnover_eligible or 0.0
        total_capex += capex
        total_turnover += turnover
        if is_aligned:
            aligned_capex += capex
            aligned_turnover += turnover

        results.append({
            "activity_id": assessment.activity_id,
            "activity_name": activity["name"],
            "sector": activity["sector"],
            "objective": activity["objective"],
            "is_eligible": is_eligible,
            "is_aligned": is_aligned,
            "substantial_contribution": assessment.substantial_contribution,
            "dnsh_passed": assessment.dnsh_passed,
            "min_safeguards": assessment.min_safeguards,
            "capex_eligible": capex,
            "turnover_eligible": turnover,
        })

    aligned_pct_capex = (aligned_capex / total_capex * 100) if total_capex > 0 else 0
    aligned_pct_turnover = (aligned_turnover / total_turnover * 100) if total_turnover > 0 else 0

    return {
        "reporting_year": request.reporting_year,
        "generated_at": datetime.utcnow().isoformat(),
        "summary": {
            "total_activities": len(results),
            "aligned_activities": sum(1 for r in results if r["is_aligned"]),
            "eligible_activities": sum(1 for r in results if r["is_eligible"]),
            "total_capex_m": round(total_capex, 2),
            "aligned_capex_m": round(aligned_capex, 2),
            "aligned_capex_pct": round(aligned_pct_capex, 1),
            "aligned_turnover_pct": round(aligned_pct_turnover, 1),
        },
        "results": results,
    }


@router.get("/kpis")
async def get_taxonomy_kpis(current_user: User = Depends(get_current_user)):
    """Return pre-computed taxonomy KPI structure for dashboard display."""
    return {
        "eligible_activities": len(REFERENCE_ACTIVITIES),
        "objectives_covered": len(OBJECTIVES),
        "sectors_covered": len(SECTORS),
        "regulation": "EU 2020/852",
        "last_update": "2023-12-01",
        "reporting_framework": "Annexes I & II - Actes délégués climatiques",
    }


@router.get("/plan", response_model=Dict[str, Any])
async def get_taxonomy_plan(current_user: User = Depends(get_current_user)):
    """Load the tenant's saved taxonomy assessment plan from Redis."""
    r = _get_redis()
    if r:
        try:
            key = f"taxonomy:plan:{current_user.tenant_id}"
            data = r.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.warning("get_taxonomy_plan Redis error: %s", e)
    return {"activities": []}


@router.post("/plan", response_model=Dict[str, Any])
async def save_taxonomy_plan(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Save the tenant's taxonomy assessment plan to Redis (TTL 1 year)."""
    r = _get_redis()
    if r:
        try:
            key = f"taxonomy:plan:{current_user.tenant_id}"
            r.set(key, json.dumps(payload), ex=365 * 24 * 3600)
            return {"saved": True}
        except Exception as e:
            logger.warning("save_taxonomy_plan Redis error: %s", e)
    return {"saved": False}


@router.post("/report", response_model=Dict[str, Any])
async def generate_taxonomy_report(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
):
    """Generate a taxonomy alignment report from saved activities (frontend-driven)."""
    activities = payload.get("activities", [])
    total = len(activities)
    aligned = sum(1 for a in activities if a.get("status") == "aligned")
    partial = sum(1 for a in activities if a.get("status") == "partial")
    not_aligned = sum(1 for a in activities if a.get("status") == "not_aligned")
    capex_pct = round((aligned / total * 100) if total > 0 else 0, 1)

    by_objective: dict = {}
    for a in activities:
        obj = a.get("objective", "unknown")
        if obj not in by_objective:
            by_objective[obj] = {"total": 0, "aligned": 0}
        by_objective[obj]["total"] += 1
        if a.get("status") == "aligned":
            by_objective[obj]["aligned"] += 1

    return {
        "reporting_year": datetime.now().year,
        "generated_at": datetime.utcnow().isoformat(),
        "summary": {
            "total_activities": total,
            "aligned_activities": aligned,
            "partial_activities": partial,
            "not_aligned_activities": not_aligned,
            "aligned_capex_pct": capex_pct,
        },
        "by_objective": by_objective,
        "regulation": "EU 2020/852",
    }

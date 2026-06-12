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
    # ÉNERGIE
    {"id": "act-011", "nace": "D35.11", "name": "Production d'électricité hydraulique", "sector": "energie", "objective": "mitigation", "threshold": "Émissions cycle de vie < 100 gCO2e/kWh, sans impact significatif sur le débit écologique", "dnsh_summary": "Évaluation état des masses d'eau selon DCE obligatoire", "eligible": True},
    {"id": "act-012", "nace": "D35.11", "name": "Production d'électricité géothermique", "sector": "energie", "objective": "mitigation", "threshold": "Émissions cycle de vie < 100 gCO2e/kWh", "dnsh_summary": "Pas d'utilisation de fluides géothermaux contaminants", "eligible": True},
    {"id": "act-013", "nace": "D35.30", "name": "Distribution de chaleur et de froid (réseaux efficaces)", "sector": "energie", "objective": "mitigation", "threshold": "Part d'EnR ou chaleur fatale ≥ 50 % dans le réseau", "dnsh_summary": "Pas d'utilisation de combustibles fossiles solides", "eligible": True},
    {"id": "act-014", "nace": "D35.14", "name": "Commerce d'électricité renouvelable (PPAs)", "sector": "energie", "objective": "mitigation", "threshold": "100 % électricité d'origine renouvelable certifiée (GO/EAC)", "dnsh_summary": "Traçabilité garanties d'origine obligatoire", "eligible": True},
    {"id": "act-015", "nace": "H49.20", "name": "Transport ferroviaire de marchandises", "sector": "transport", "objective": "mitigation", "threshold": "Émissions directes < 50 gCO2e/tkm (électrique ou H2)", "dnsh_summary": "Infrastructure conforme réglementation bruit UE", "eligible": True},
    {"id": "act-016", "nace": "H50.10", "name": "Transport maritime bas carbone", "sector": "transport", "objective": "mitigation", "threshold": "Réduction 50 % intensité carbone vs référence IMO 2008", "dnsh_summary": "Pas de rejet polluants en mer, conformité MARPOL", "eligible": True},
    {"id": "act-017", "nace": "H49.31", "name": "Transport urbain zéro émission (bus électrique/H2)", "sector": "transport", "objective": "mitigation", "threshold": "Zéro émission directe (électrique ou pile à combustible)", "dnsh_summary": "Gestion fin de vie batteries obligatoire", "eligible": True},
    {"id": "act-018", "nace": "H52.21", "name": "Infrastructure de recharge véhicules électriques", "sector": "transport", "objective": "mitigation", "threshold": "Électricité fournie ≥ 70 % renouvelable d'ici 2025", "dnsh_summary": "Pas d'impact significatif sur biodiversité locale", "eligible": True},
    {"id": "act-019", "nace": "L68.20", "name": "Location de bâtiments à haute performance énergétique", "sector": "construction", "objective": "mitigation", "threshold": "Classe énergie A ou dans les 15 % les plus performants du parc national", "dnsh_summary": "Pas d'amiante, conformité substances dangereuses", "eligible": True},
    {"id": "act-020", "nace": "F42.21", "name": "Construction réseaux d'eau et assainissement", "sector": "construction", "objective": "water", "threshold": "Réduction pertes réseau ≥ 20 % ou conformité BREF eau", "dnsh_summary": "Pas de rejet non traité dans le milieu", "eligible": True},
    {"id": "act-021", "nace": "C20.11", "name": "Production d'hydrogène vert (électrolyse EnR)", "sector": "industrie", "objective": "mitigation", "threshold": "Électrolyse alimentée ≥ 100 % EnR ou émissions < 3 tCO2e/tH2", "dnsh_summary": "Pas d'utilisation PFAS, gestion eaux de procédé", "eligible": True},
    {"id": "act-022", "nace": "C23.11", "name": "Production de verre recyclé", "sector": "industrie", "objective": "circular", "threshold": "Taux de calcin ≥ 60 % en masse dans le mélange verrier", "dnsh_summary": "Pas d'émissions métaux lourds supérieures aux VLE BREF", "eligible": True},
    {"id": "act-023", "nace": "C22.29", "name": "Fabrication de produits en plastique recyclé", "sector": "industrie", "objective": "circular", "threshold": "Contenu recyclé ≥ 50 % en masse, pas de plastiques à usage unique", "dnsh_summary": "Pas d'additifs CMR ou perturbateurs endocriniens", "eligible": True},
    {"id": "act-024", "nace": "C28.11", "name": "Fabrication de turbines et équipements EnR", "sector": "industrie", "objective": "mitigation", "threshold": "Émissions fabrication ≤ 1 200 kgCO2e/kW installé", "dnsh_summary": "Plan de recyclabilité fin de vie ≥ 85 % en masse", "eligible": True},
    {"id": "act-025", "nace": "C25.11", "name": "Production de structures métalliques légères durables", "sector": "industrie", "objective": "mitigation", "threshold": "Contenu acier recyclé ≥ 70 %, émissions process < 1,5 tCO2e/t", "dnsh_summary": "Gestion stricte déchets de peinture et solvants", "eligible": True},
    {"id": "act-026", "nace": "A02.10", "name": "Sylviculture et gestion forestière durable (PEFC/FSC)", "sector": "agriculture", "objective": "mitigation", "threshold": "Certification PEFC ou FSC, plan de gestion forestière agréé", "dnsh_summary": "Pas de conversion forêts primaires, maintien biodiversité", "eligible": True},
    {"id": "act-027", "nace": "A01.13", "name": "Cultures légumineuses fixatrices d'azote", "sector": "agriculture", "objective": "mitigation", "threshold": "Réduction engrais azotés ≥ 20 % vs référence sectorielle", "dnsh_summary": "Pas d'utilisation pesticides inscrits sur liste prioritaire UE", "eligible": True},
    {"id": "act-028", "nace": "J61.10", "name": "Réseaux télécom très haut débit (fibre optique)", "sector": "tic", "objective": "mitigation", "threshold": "Déploiement FTTH remplaçant infrastructure cuivre énergivore", "dnsh_summary": "Plan de collecte et recyclage équipements anciens", "eligible": True},
    {"id": "act-029", "nace": "E37.00", "name": "Collecte et traitement des eaux usées", "sector": "eau", "objective": "water", "threshold": "Traitement tertiaire ≥ 95 % des flux, réutilisation eaux traitées", "dnsh_summary": "Pas de rejet micropolluants > NQE DCE dans milieu récepteur", "eligible": True},
    {"id": "act-030", "nace": "E38.21", "name": "Traitement et valorisation des déchets dangereux", "sector": "eau", "objective": "pollution", "threshold": "Valorisation matière ou énergie ≥ 70 %, zéro mise en décharge brute", "dnsh_summary": "Conformité directive 2008/98/CE et BREF déchets dangereux", "eligible": True},
    {"id": "act-031", "nace": "K64.91", "name": "Financement de projets d'énergies renouvelables", "sector": "finance", "objective": "mitigation", "threshold": "Portefeuille ≥ 90 % projets taxonomy-alignés ou en transition", "dnsh_summary": "Due diligence E&S conforme Principes Équateur", "eligible": True},
    {"id": "act-032", "nace": "K65.11", "name": "Assurance des risques climatiques physiques", "sector": "finance", "objective": "adaptation", "threshold": "Produits couvrant risques climatiques NGFS : inondation, sécheresse, tempête", "dnsh_summary": "Pas d'exclusion discriminatoire des zones à risque élevé", "eligible": True},
    {"id": "act-033", "nace": "K64.20", "name": "Gestion de fonds durables Article 9 SFDR", "sector": "finance", "objective": "mitigation", "threshold": "Portefeuille 100 % investissements durables SFDR Art. 9", "dnsh_summary": "Reporting PAI obligatoire", "eligible": True},
    {"id": "act-034", "nace": "M71.20", "name": "Conseil et ingénierie en efficacité énergétique", "sector": "industrie", "objective": "mitigation", "threshold": "Économies d'énergie réalisées ≥ 30 % vs situation initiale", "dnsh_summary": "Pas de recommandations vers équipements à combustibles fossiles", "eligible": True},
    {"id": "act-035", "nace": "M72.19", "name": "R&D en technologies bas carbone (cleantech)", "sector": "tic", "objective": "mitigation", "threshold": "Projets contribuant directement aux 6 objectifs EU Taxonomy", "dnsh_summary": "Gestion éthique des données, pas d'expériences nuisibles", "eligible": True},
]

DNSH_CRITERIA: dict = {
    "act-001": {
        "adaptation": {"criterion": "Évaluation des risques climatiques physiques sur l'installation (inondation, chaleur extrême)", "required": True},
        "water": {"criterion": "Pas d'utilisation excessive d'eau pour refroidissement (refroidissement sec ou à air privilégié)", "required": True},
        "circular": {"criterion": "Plan de recyclage des panneaux photovoltaïques en fin de vie (≥ 95 % en masse)", "required": True},
        "pollution": {"criterion": "Pas de substances SVHC dans les panneaux (plomb et cadmium limités par directive RoHS)", "required": True},
        "biodiversity": {"criterion": "Étude d'impact faune/flore, installation hors zones Natura 2000 sensibles", "required": True},
    },
    "act-002": {
        "adaptation": {"criterion": "Turbines conçues pour scénarios climatiques futurs (vitesse vent P90, risque givre)", "required": True},
        "water": {"criterion": "Pas d'imperméabilisation excessive des sols — surfaces perméables autour des fondations", "required": True},
        "circular": {"criterion": "Plan de recyclage des pales (objectif ≥ 80 % en masse d'ici 2030)", "required": True},
        "pollution": {"criterion": "Niveaux sonores conformes à la directive 2002/49/CE — cartes de bruit disponibles", "required": True},
        "biodiversity": {"criterion": "Évaluation impacts avifaune et chiroptères, mesures compensatoires documentées", "required": True},
    },
    "_default": {
        "adaptation": {"criterion": "Évaluation et gestion des risques climatiques physiques (court, moyen, long terme selon TCFD)", "required": True},
        "water": {"criterion": "Pas de détérioration de l'état des masses d'eau — conformité à la directive-cadre sur l'eau (DCE)", "required": True},
        "circular": {"criterion": "Prévention des déchets, réutilisation et recyclage prioritaires selon la hiérarchie des déchets", "required": True},
        "pollution": {"criterion": "Pas d'émissions polluantes significatives dans l'air, l'eau et les sols au-delà des meilleures techniques disponibles (MTD)", "required": True},
        "biodiversity": {"criterion": "Pas de dégradation significative des habitats naturels sensibles ou des espèces protégées (directive Habitats)", "required": True},
    },
}


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
    dnsh_details = DNSH_CRITERIA.get(activity_id, DNSH_CRITERIA["_default"])
    return {**activity, "dnsh_details": dnsh_details}


@router.get("/activities/{activity_id}/dnsh")
async def get_dnsh_criteria(
    activity_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get detailed DNSH criteria for a specific activity."""
    activity = next((a for a in REFERENCE_ACTIVITIES if a["id"] == activity_id), None)
    if not activity:
        raise HTTPException(status_code=404, detail="Activité non trouvée")
    objective_names = {o["id"]: o["name"] for o in OBJECTIVES}
    raw = DNSH_CRITERIA.get(activity_id, DNSH_CRITERIA["_default"])
    result = {
        obj_id: {
            "objective_name": objective_names.get(obj_id, obj_id),
            "criterion": crit["criterion"],
            "required": crit["required"],
        }
        for obj_id, crit in raw.items()
    }
    return {"activity_id": activity_id, "main_objective": activity["objective"], "dnsh_criteria": result}


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

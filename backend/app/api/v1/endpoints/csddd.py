"""CSDDD — Corporate Sustainability Due Diligence Directive 2024/1760/UE.

Persistence migrated from Redis (90-day TTL) to PostgreSQL
(framework_assessments table, framework='csddd').
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user
from app.db.session import get_db
from app.models.framework_assessment import FrameworkAssessment
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/csddd", tags=["CSDDD Due Diligence"])

_FRAMEWORK = "csddd"


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CSDDDSaveRequest(BaseModel):
    scope: Dict[str, Any] = {}
    risk_assessments: List[Dict[str, Any]] = []
    grievances: List[Dict[str, Any]] = []
    monitoring: Dict[str, Any] = {}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _empty() -> Dict[str, Any]:
    return {
        "scope": {},
        "risk_assessments": [],
        "grievances": [],
        "monitoring": {},
        "last_saved": None,
    }


async def _load(db: AsyncSession, tenant_id: Any, user_id: Any) -> Optional[Dict[str, Any]]:
    try:
        result = await db.execute(
            select(FrameworkAssessment).where(
                FrameworkAssessment.tenant_id == tenant_id,
                FrameworkAssessment.user_id == user_id,
                FrameworkAssessment.framework == _FRAMEWORK,
            )
        )
        row = result.scalar_one_or_none()
        return row.data if row else None
    except Exception as exc:
        logger.warning("CSDDD load error (tenant=%s): %s", tenant_id, exc)
        return None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/assessment")
async def get_assessment(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve saved CSDDD due diligence assessment."""
    tenant_id = getattr(request.state, "tenant_id", None)
    if not tenant_id:
        return _empty()
    data = await _load(db, tenant_id, current_user.id)
    return data if data is not None else _empty()


@router.post("/assessment")
async def save_assessment(
    req: CSDDDSaveRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upsert CSDDD due diligence assessment (PostgreSQL ON CONFLICT DO UPDATE)."""
    tenant_id = getattr(request.state, "tenant_id", None)
    now_iso = datetime.now(timezone.utc).isoformat()

    payload: Dict[str, Any] = {
        "scope": req.scope,
        "risk_assessments": req.risk_assessments,
        "grievances": req.grievances,
        "monitoring": req.monitoring,
        "last_saved": now_iso,
    }

    if not tenant_id:
        logger.warning("CSDDD save skipped: no tenant_id")
        return {"status": "saved", "last_saved": now_iso}

    try:
        await db.execute(
            pg_insert(FrameworkAssessment)
            .values(
                tenant_id=tenant_id,
                user_id=current_user.id,
                framework=_FRAMEWORK,
                data=payload,
            )
            .on_conflict_do_update(
                index_elements=["tenant_id", "user_id", "framework"],
                set_={"data": payload, "updated_at": datetime.now(timezone.utc)},
            )
        )
        await db.flush()
    except Exception as exc:
        logger.warning("CSDDD save error (tenant=%s): %s", tenant_id, exc)

    return {"status": "saved", "last_saved": now_iso}


@router.get("/risk-catalog")
async def get_risk_catalog(current_user: User = Depends(get_current_user)):
    """Return the predefined CSDDD risk catalog (UNGP + OECD + ILO + environmental)."""
    return {"risks": RISK_CATALOG, "total": len(RISK_CATALOG)}


# ─── Risk Catalog ─────────────────────────────────────────────────────────────

RISK_CATALOG = [
    # ── DROITS HUMAINS ────────────────────────────────────────────────────────
    {"id": "hr-01", "category": "human_rights", "subcategory": "Travail forcé",
     "name": "Travail forcé ou obligatoire",
     "description": "Recours au travail forcé, servitude pour dettes ou traite des êtres humains dans les opérations propres ou la chaîne de valeur.",
     "reference": "Convention OIT n° 29 & 105 · Art. 3 CSDDD Annexe I", "scope": "all"},
    {"id": "hr-02", "category": "human_rights", "subcategory": "Travail des enfants",
     "name": "Travail des enfants",
     "description": "Emploi d'enfants de moins de 15 ans (ou 14 ans dans les pays en développement selon l'OIT) ou recours à des mineurs dans des conditions dangereuses.",
     "reference": "Convention OIT n° 138 & 182 · Art. 3 CSDDD", "scope": "all"},
    {"id": "hr-03", "category": "human_rights", "subcategory": "Discrimination",
     "name": "Discrimination à l'emploi et à l'embauche",
     "description": "Discrimination fondée sur le genre, l'origine ethnique, le handicap, l'âge, l'orientation sexuelle ou la religion dans les pratiques RH.",
     "reference": "Convention OIT n° 100 & 111 · CEDH Art. 14", "scope": "own_operations"},
    {"id": "hr-04", "category": "human_rights", "subcategory": "Liberté syndicale",
     "name": "Restrictions à la liberté syndicale et à la négociation collective",
     "description": "Obstacles à l'organisation syndicale, à la négociation collective ou représailles contre les représentants des travailleurs.",
     "reference": "Convention OIT n° 87 & 98 · UNGP Principe 12", "scope": "all"},
    {"id": "hr-05", "category": "human_rights", "subcategory": "Santé & Sécurité",
     "name": "Conditions de travail dangereuses",
     "description": "Exposition à des risques physiques, chimiques ou psychosociaux sans mesures de prévention et de protection adéquates.",
     "reference": "Convention OIT n° 155 · Directive 89/391/CE", "scope": "all"},
    {"id": "hr-06", "category": "human_rights", "subcategory": "Salaire décent",
     "name": "Rémunération insuffisante (sous le salaire vital)",
     "description": "Rémunération inférieure au salaire minimum légal ou insuffisante pour couvrir les besoins fondamentaux du travailleur et de sa famille.",
     "reference": "UNGP Principe 12 · OIT Convention C131", "scope": "all"},
    {"id": "hr-07", "category": "human_rights", "subcategory": "Communautés locales",
     "name": "Violation des droits des communautés locales et peuples autochtones",
     "description": "Atteinte aux droits fonciers, expropriations sans consentement libre, préalable et éclairé (CLPE), impacts sur les moyens de subsistance.",
     "reference": "UNDRIP · UNGP Principe 12 · Convention OIT n° 169", "scope": "value_chain"},
    {"id": "hr-08", "category": "human_rights", "subcategory": "Vie privée",
     "name": "Atteinte au droit à la vie privée et aux données personnelles",
     "description": "Collecte, traitement ou transmission de données personnelles sans consentement éclairé ou en violation des droits fondamentaux.",
     "reference": "RGPD (UE) 2016/679 · UNGP Principe 12", "scope": "own_operations"},
    # ── ENVIRONNEMENT ─────────────────────────────────────────────────────────
    {"id": "env-01", "category": "environment", "subcategory": "Déforestation",
     "name": "Déforestation et dégradation forestière",
     "description": "Contribution directe ou indirecte à la déforestation ou dégradation des forêts primaires et secondaires via la chaîne d'approvisionnement.",
     "reference": "Règlement UE 2023/1115 · CSDDD Annexe I", "scope": "value_chain"},
    {"id": "env-02", "category": "environment", "subcategory": "Pollution eau",
     "name": "Contamination des ressources en eau",
     "description": "Rejet de polluants, métaux lourds, nitrates ou substances nocives dans les eaux de surface, souterraines ou marines sans traitement adéquat.",
     "reference": "DCE 2000/60/CE · CSDDD Annexe I point 15", "scope": "all"},
    {"id": "env-03", "category": "environment", "subcategory": "Pollution sols",
     "name": "Pollution des sols et des terres agricoles",
     "description": "Déversements accidentels ou chroniques de substances dangereuses contaminant les sols cultivables ou les zones protégées.",
     "reference": "Directive responsabilité environnementale 2004/35/CE · CSDDD", "scope": "all"},
    {"id": "env-04", "category": "environment", "subcategory": "Pollution air",
     "name": "Émissions polluantes atmosphériques excessives",
     "description": "Émissions de NOx, SOx, particules fines PM2.5/PM10, COVNM au-delà des valeurs limites applicables (BREF MTD).",
     "reference": "Directive NEC 2016/2284 · BREF MTD · CSDDD", "scope": "own_operations"},
    {"id": "env-05", "category": "environment", "subcategory": "Biodiversité",
     "name": "Perte de biodiversité et dégradation des habitats naturels",
     "description": "Destruction ou fragmentation d'habitats protégés, menace sur les espèces endémiques.",
     "reference": "Directive Habitats 92/43/CEE · TNFD · CSDDD Annexe I", "scope": "all"},
    {"id": "env-06", "category": "environment", "subcategory": "Déchets dangereux",
     "name": "Gestion illicite des déchets dangereux",
     "description": "Exportation illégale de déchets dangereux vers des pays tiers, mise en décharge non conforme ou brûlage à l'air libre.",
     "reference": "Convention de Bâle · Règlement 1013/2006/CE · CSDDD Annexe I", "scope": "value_chain"},
    {"id": "env-07", "category": "environment", "subcategory": "Mercure & métaux lourds",
     "name": "Utilisation et rejet de mercure et métaux lourds",
     "description": "Utilisation de mercure dans les procédés industriels ou artisanaux, rejet dans l'environnement sans traitement conforme.",
     "reference": "Convention de Minamata · CSDDD Annexe I point 9", "scope": "all"},
    {"id": "env-08", "category": "environment", "subcategory": "Produits chimiques",
     "name": "Exposition aux substances chimiques dangereuses (CMR, PFAS)",
     "description": "Production, utilisation ou mise sur le marché de substances CMR ou PFAS sans plan de substitution documenté.",
     "reference": "Règlement REACH (CE) n° 1907/2006 · Stratégie UE chimiques durables", "scope": "all"},
]

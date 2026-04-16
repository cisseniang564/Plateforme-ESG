"""
AI ESG Insights — hybrid recommendation engine:
  - Rule-based insights (always available, no API key needed)
  - OpenAI GPT enhancement for narrative analysis & chat (when OPENAI_API_KEY set)
"""
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.models.esg_score import ESGScore
from app.models.data_entry import DataEntry
from app.models.organization import Organization
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── OpenAI helper ────────────────────────────────────────────────────────────

def _get_openai_client():
    """Return an OpenAI client or None if not configured."""
    api_key = getattr(settings, 'OPENAI_API_KEY', None)
    if not api_key:
        return None
    try:
        from openai import AsyncOpenAI
        return AsyncOpenAI(api_key=api_key)
    except ImportError:
        logger.warning("openai package not installed")
        return None


async def _call_openai(client, system_prompt: str, user_message: str, model: str = None) -> Optional[str]:
    """Call OpenAI chat completions and return the response text."""
    try:
        m = model or getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini')
        response = await client.chat.completions.create(
            model=m,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_message},
            ],
            max_tokens=1200,
            temperature=0.4,
        )
        return response.choices[0].message.content
    except Exception as exc:
        logger.warning("OpenAI call failed: %s", exc)
        return None


# ─── Pydantic models ──────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None  # optional: pass scores/data


class AnalyzeRequest(BaseModel):
    pillar: Optional[str] = None  # environmental | social | governance | None (all)
    organization_id: Optional[str] = None

# ─── Recommendation library ────────────────────────────────────────────────────

RECO_LIBRARY: List[Dict[str, Any]] = [
    # ── Environmental ──────────────────────────────────────────────────────────
    {
        "id": "env_scope1",
        "pillar": "environmental",
        "title": "Mesurer et réduire vos émissions Scope 1",
        "description": (
            "Les émissions directes de votre organisation (combustion, processus industriels, "
            "véhicules de flotte) représentent le levier le plus immédiat pour réduire votre "
            "empreinte carbone. Mettez en place une mesure mensuelle et un plan de réduction chiffré."
        ),
        "quick_win": True,
        "effort": "medium",
        "impact": "high",
        "score_gain_est": 8,
        "tags": ["Carbone", "Scope 1", "ESRS E1"],
        "actions": [
            "Installer des sous-compteurs d'énergie par zone / équipement",
            "Calculer mensuellement les émissions Scope 1 via un outil certifié",
            "Fixer un objectif de réduction -5 % / an sur 3 ans",
            "Documenter le plan de transition dans le rapport CSRD",
        ],
        "condition": lambda e, s, g: e < 60,
    },
    {
        "id": "env_scope2",
        "pillar": "environmental",
        "title": "Basculer vers de l'électricité verte (Scope 2)",
        "description": (
            "La souscription à un contrat d'électricité 100 % renouvelable (ou l'achat de Garanties "
            "d'Origine) permet de réduire significativement les émissions Scope 2 à coût modéré et "
            "d'améliorer votre score environnemental en quelques semaines."
        ),
        "quick_win": True,
        "effort": "low",
        "impact": "medium",
        "score_gain_est": 5,
        "tags": ["Énergie", "Scope 2", "ESRS E1"],
        "actions": [
            "Demander un devis pour un contrat PPW ou PPA à votre fournisseur d'énergie",
            "Acquérir des Garanties d'Origine (GO) pour couvrir 100 % de votre conso",
            "Mettre à jour votre bilan carbone avec les nouvelles valeurs Scope 2",
        ],
        "condition": lambda e, s, g: e < 70,
    },
    {
        "id": "env_scope3",
        "pillar": "environmental",
        "title": "Cartographier vos émissions Scope 3 (chaîne de valeur)",
        "description": (
            "Le Scope 3 représente en moyenne 70–90 % des émissions d'une organisation. "
            "Une cartographie des postes les plus émetteurs (achats, logistique, déplacements) "
            "est exigée par le CSRD et permet d'identifier les actions les plus impactantes."
        ),
        "quick_win": False,
        "effort": "high",
        "impact": "high",
        "score_gain_est": 12,
        "tags": ["Carbone", "Scope 3", "ESRS E1", "Chaîne de valeur"],
        "actions": [
            "Identifier les 5 postes Scope 3 les plus émetteurs (GHC Protocol)",
            "Collecter les données primaires auprès de vos 10 principaux fournisseurs",
            "Intégrer le Scope 3 dans votre tableau de bord ESG trimestriel",
            "Publier une trajectoire de réduction alignée avec la SBTi",
        ],
        "condition": lambda e, s, g: e < 75,
    },
    {
        "id": "env_biodiversity",
        "pillar": "environmental",
        "title": "Évaluer votre impact sur la biodiversité (ESRS E4)",
        "description": (
            "La biodiversité est de plus en plus scrutée par les investisseurs et réglementée "
            "par la CSRD. Un diagnostic TNFD/SBTN vous permettra de cartographier vos dépendances "
            "et impacts sur les écosystèmes et d'anticiper les obligations de reporting."
        ),
        "quick_win": False,
        "effort": "medium",
        "impact": "medium",
        "score_gain_est": 6,
        "tags": ["Biodiversité", "ESRS E4", "Nature"],
        "actions": [
            "Réaliser un diagnostic TNFD sur vos sites opérationnels",
            "Identifier les zones à fort enjeu biodiversité dans votre périmètre",
            "Mettre en place au moins un programme de restauration des écosystèmes",
            "Publier vos indicateurs biodiversité dans le prochain rapport ESG",
        ],
        "condition": lambda e, s, g: e < 65,
    },
    {
        "id": "env_water",
        "pillar": "environmental",
        "title": "Optimiser la gestion de l'eau (ESRS E3)",
        "description": (
            "La stress hydrique devient un risque physique majeur. Mesurer et réduire la "
            "consommation d'eau, traiter les rejets et publier des indicateurs hydrique "
            "améliore votre conformité ESRS E3 et renforce votre résilience opérationnelle."
        ),
        "quick_win": True,
        "effort": "low",
        "impact": "medium",
        "score_gain_est": 4,
        "tags": ["Eau", "ESRS E3"],
        "actions": [
            "Installer des compteurs d'eau par usage (process, sanitaires, arrosage)",
            "Fixer un objectif de réduction de la consommation d'eau (-10 % / an)",
            "Contrôler la conformité de vos rejets aqueux",
        ],
        "condition": lambda e, s, g: e < 70,
    },
    # ── Social ──────────────────────────────────────────────────────────────────
    {
        "id": "soc_gender_pay",
        "pillar": "social",
        "title": "Réduire l'écart de rémunération H/F (Index Égalité)",
        "description": (
            "Un Index Égalité Professionnelle inférieur à 75 / 100 déclenche des obligations "
            "légales. L'améliorer renforce votre score Social et votre attractivité employeur, "
            "tout en réduisant le risque de contentieux."
        ),
        "quick_win": False,
        "effort": "medium",
        "impact": "high",
        "score_gain_est": 7,
        "tags": ["Genre", "Égalité", "ESRS S1"],
        "actions": [
            "Calculer et publier votre Index Égalité Professionnelle",
            "Identifier les 10 postes avec le plus fort écart salarial",
            "Mettre en place un budget de correction dédié",
            "Fixer un objectif d'index > 85 / 100 à 2 ans",
        ],
        "condition": lambda e, s, g: s < 65,
    },
    {
        "id": "soc_training",
        "pillar": "social",
        "title": "Augmenter le taux de formation et développement des compétences",
        "description": (
            "Le nombre d'heures de formation par salarié est un KPI clé du pilier Social. "
            "Atteindre 24 h / an / ETP (benchmark sectoriel moyen) améliore l'engagement, "
            "la rétention et votre note ESG sociale."
        ),
        "quick_win": True,
        "effort": "low",
        "impact": "medium",
        "score_gain_est": 5,
        "tags": ["Formation", "RH", "ESRS S1"],
        "actions": [
            "Calculer les heures de formation actuelles par catégorie de salarié",
            "Déployer 3 modules e-learning ESG accessibles à tous",
            "Fixer un objectif : +20 % d'heures de formation vs N-1",
        ],
        "condition": lambda e, s, g: s < 70,
    },
    {
        "id": "soc_health_safety",
        "pillar": "social",
        "title": "Réduire le taux de fréquence des accidents du travail",
        "description": (
            "Le taux de fréquence (TF) des accidents est un indicateur de sécurité fondamental. "
            "Un TF élevé pèse lourdement sur le score Social et expose à des risques légaux. "
            "Un programme de prévention structuré permet de réduire le TF de 30 % en 18 mois."
        ),
        "quick_win": False,
        "effort": "medium",
        "impact": "high",
        "score_gain_est": 8,
        "tags": ["Santé", "Sécurité", "ESRS S1"],
        "actions": [
            "Analyser les 5 principales causes d'accident sur les 24 derniers mois",
            "Déployer un programme de culture sécurité (near-miss reporting)",
            "Former 100 % des managers à la sécurité au travail",
            "Publier le TF et TG mensuellement dans le dashboard ESG",
        ],
        "condition": lambda e, s, g: s < 60,
    },
    {
        "id": "soc_diversity",
        "pillar": "social",
        "title": "Renforcer la diversité au Comité de Direction",
        "description": (
            "La part de femmes et de profils internationaux dans les instances dirigeantes "
            "est scrutée par les agences de notation. Viser 40 % de diversité de genre "
            "au CODIR améliore le score Social ET Gouvernance."
        ),
        "quick_win": False,
        "effort": "high",
        "impact": "high",
        "score_gain_est": 6,
        "tags": ["Diversité", "ESRS S1", "ESRS G1"],
        "actions": [
            "Auditer la composition actuelle du CODIR et des organes de surveillance",
            "Fixer un plan de succession priorisant la mixité",
            "Mettre en place un programme de mentorat pour les talents féminins",
        ],
        "condition": lambda e, s, g: s < 70,
    },
    {
        "id": "soc_supply_chain",
        "pillar": "social",
        "title": "Auditer les conditions sociales de votre chaîne d'approvisionnement",
        "description": (
            "La loi sur le devoir de vigilance et la CSRD exigent de connaître et maîtriser "
            "les risques sociaux (travail forcé, droits humains) chez vos fournisseurs. "
            "Un programme d'audit permet de réduire ce risque et d'améliorer votre note."
        ),
        "quick_win": False,
        "effort": "high",
        "impact": "high",
        "score_gain_est": 9,
        "tags": ["Chaîne de valeur", "ESRS S2", "Droits humains"],
        "actions": [
            "Cartographier vos fournisseurs tier-1 par niveau de risque social",
            "Auditer les 20 fournisseurs à plus fort risque (SA8000 ou EcoVadis)",
            "Intégrer des clauses ESG dans tous les nouveaux contrats fournisseurs",
            "Publier votre plan de vigilance annuel",
        ],
        "condition": lambda e, s, g: s < 65,
    },
    # ── Governance ─────────────────────────────────────────────────────────────
    {
        "id": "gov_policy",
        "pillar": "governance",
        "title": "Formaliser une politique ESG approuvée par le CA",
        "description": (
            "L'absence de politique ESG formalisée et approuvée au niveau du Conseil "
            "d'Administration est un signal négatif fort pour les investisseurs ESG. "
            "Sa mise en place est rapide et impacte immédiatement le score Gouvernance."
        ),
        "quick_win": True,
        "effort": "low",
        "impact": "high",
        "score_gain_est": 10,
        "tags": ["Politique ESG", "Gouvernance", "ESRS G1"],
        "actions": [
            "Rédiger une politique ESG d'une page (vision, engagements, KPIs)",
            "La faire approuver en séance du Conseil d'Administration",
            "La publier sur votre site institutionnel",
            "Désigner un responsable ESG officiel (CHRO, DAF ou CSO)",
        ],
        "condition": lambda e, s, g: g < 65,
    },
    {
        "id": "gov_anticorruption",
        "pillar": "governance",
        "title": "Renforcer le dispositif anti-corruption (ESRS G1-6)",
        "description": (
            "Les dispositifs anti-corruption (code éthique, alerte, formation) sont "
            "obligatoires pour les entreprises soumises à la loi Sapin II et scrutés par "
            "la CSRD ESRS G1. Leur formalisation améliore significativement le score Gouvernance."
        ),
        "quick_win": False,
        "effort": "medium",
        "impact": "high",
        "score_gain_est": 7,
        "tags": ["Anti-corruption", "Éthique", "ESRS G1"],
        "actions": [
            "Mettre à jour votre Code de conduite et le diffuser à 100 % des collaborateurs",
            "Déployer un dispositif d'alerte éthique conforme loi Sapin II",
            "Former 100 % du management sur les risques de corruption",
            "Réaliser une cartographie des risques de corruption annuelle",
        ],
        "condition": lambda e, s, g: g < 70,
    },
    {
        "id": "gov_transparency",
        "pillar": "governance",
        "title": "Améliorer la transparence et la qualité du reporting ESG",
        "description": (
            "Un reporting ESG incomplet ou peu fiable pénalise votre note. Aligner vos "
            "publications sur les standards GRI / CSRD, faire vérifier les données par "
            "un tiers et publier un rapport annuel dédié augmente la confiance des parties prenantes."
        ),
        "quick_win": True,
        "effort": "medium",
        "impact": "high",
        "score_gain_est": 8,
        "tags": ["Reporting", "GRI", "CSRD", "ESRS G1"],
        "actions": [
            "Aligner votre rapport ESG sur GRI Universal Standards 2021",
            "Faire vérifier vos indicateurs par un auditeur tiers (assurance limitée)",
            "Déclarer votre conformité CSRD sur le registre national",
            "Publier votre rapport ESG en format XBRL compatible ESMA",
        ],
        "condition": lambda e, s, g: g < 75,
    },
    {
        "id": "gov_data_quality",
        "pillar": "governance",
        "title": "Atteindre 80 % de données ESG vérifiées",
        "description": (
            "Un taux de vérification des données ESG inférieur à 80 % réduit la crédibilité "
            "de vos scores et pénalise votre note de gouvernance. Mettez en place un workflow "
            "de validation interne et planifiez une assurance externe."
        ),
        "quick_win": True,
        "effort": "low",
        "impact": "medium",
        "score_gain_est": 5,
        "tags": ["Qualité des données", "Audit", "Gouvernance"],
        "actions": [
            "Activer le workflow de validation dans ESGFlow pour chaque indicateur clé",
            "Désigner un Data Owner ESG par pilier (E, S, G)",
            "Planifier une vérification tierce des 20 indicateurs les plus matériels",
        ],
        "condition": lambda e, s, g: g < 70,
    },
    {
        "id": "gov_board",
        "pillar": "governance",
        "title": "Intégrer des objectifs ESG dans la rémunération variable",
        "description": (
            "Lier une partie (5–15 %) de la rémunération variable des dirigeants à des "
            "objectifs ESG mesurables est un signal fort de gouvernance et est scruté par "
            "les proxy advisors (ISS, Glass Lewis). Cela améliore votre note Gouvernance."
        ),
        "quick_win": False,
        "effort": "medium",
        "impact": "high",
        "score_gain_est": 6,
        "tags": ["Rémunération", "ESRS G1", "Gouvernance"],
        "actions": [
            "Définir 3 KPIs ESG reliés à la rémunération variable (ex. émissions, TF, Index égalité)",
            "Faire valider le mécanisme par le Comité des Rémunérations",
            "Publier le mécanisme dans le rapport de gouvernance / DRU",
        ],
        "condition": lambda e, s, g: g < 68,
    },
]


# ─── Helper functions ──────────────────────────────────────────────────────────

def _rating_to_label(rating: Optional[str]) -> str:
    map_ = {"A": "Excellent", "B": "Bon", "C": "Passable", "D": "Faible", "F": "Insuffisant"}
    return map_.get(rating or "", "Non évalué")


def _score_to_rating(score: float) -> str:
    if score >= 80: return "A"
    if score >= 65: return "B"
    if score >= 50: return "C"
    if score >= 35: return "D"
    return "F"


def _effort_label(effort: str) -> str:
    return {"low": "Faible", "medium": "Moyen", "high": "Élevé"}.get(effort, effort)


def _impact_label(impact: str) -> str:
    return {"low": "Faible", "medium": "Moyen", "high": "Élevé"}.get(impact, impact)


def _pillar_label(pillar: str) -> str:
    return {"environmental": "Environnemental", "social": "Social", "governance": "Gouvernance"}.get(pillar, pillar)


def _pillar_color(pillar: str) -> str:
    return {"environmental": "green", "social": "blue", "governance": "purple"}.get(pillar, "gray")


def _generate_recommendations(
    env: float, soc: float, gov: float, data_count: int
) -> List[Dict[str, Any]]:
    recos = []
    for r in RECO_LIBRARY:
        if r["condition"](env, soc, gov):
            recos.append({
                "id": r["id"],
                "pillar": r["pillar"],
                "pillar_label": _pillar_label(r["pillar"]),
                "pillar_color": _pillar_color(r["pillar"]),
                "title": r["title"],
                "description": r["description"],
                "quick_win": r["quick_win"],
                "effort": r["effort"],
                "effort_label": _effort_label(r["effort"]),
                "impact": r["impact"],
                "impact_label": _impact_label(r["impact"]),
                "score_gain_est": r["score_gain_est"],
                "tags": r["tags"],
                "actions": r["actions"],
            })
    # Sort: high impact first, then quick wins
    impact_order = {"high": 0, "medium": 1, "low": 2}
    recos.sort(key=lambda x: (impact_order.get(x["impact"], 9), not x["quick_win"]))
    return recos


def _build_strengths(env: float, soc: float, gov: float) -> List[str]:
    strengths = []
    if env >= 75: strengths.append("Performance environnementale au-dessus de la moyenne sectorielle")
    if soc >= 75: strengths.append("Politique sociale solide et indicateurs RH bien documentés")
    if gov >= 75: strengths.append("Gouvernance transparente avec reporting aligné sur les standards")
    if env >= 85: strengths.append("Score Environnemental excellent — position de leader E")
    if soc >= 85: strengths.append("Score Social remarquable — benchmark des meilleures pratiques RH")
    if gov >= 85: strengths.append("Score Gouvernance de premier plan — exemplarité de transparence")
    return strengths or ["Continuez à collecter des données pour enrichir votre analyse"]


def _build_risks(env: float, soc: float, gov: float) -> List[Dict[str, Any]]:
    risks = []
    if env < 40:
        risks.append({"pillar": "environmental", "label": "Score Environnemental critique (< 40)", "level": "high"})
    elif env < 55:
        risks.append({"pillar": "environmental", "label": "Score Environnemental insuffisant", "level": "medium"})
    if soc < 40:
        risks.append({"pillar": "social", "label": "Score Social critique (< 40)", "level": "high"})
    elif soc < 55:
        risks.append({"pillar": "social", "label": "Score Social insuffisant", "level": "medium"})
    if gov < 40:
        risks.append({"pillar": "governance", "label": "Score Gouvernance critique (< 40)", "level": "high"})
    elif gov < 55:
        risks.append({"pillar": "governance", "label": "Score Gouvernance insuffisant", "level": "medium"})
    return risks


# ─── Route ────────────────────────────────────────────────────────────────────

@router.get("")
async def get_ai_insights(
    organization_id: Optional[str] = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate AI-powered ESG recommendations based on the latest score.
    Returns prioritised, actionable insights grouped by pillar.
    """
    try:
        # ── 1. Fetch latest ESG score ──────────────────────────────────────────
        score_query = (
            select(ESGScore)
            .where(ESGScore.tenant_id == user_id)
            .order_by(desc(ESGScore.calculation_date))
            .limit(1)
        )
        if organization_id:
            score_query = score_query.where(ESGScore.organization_id == organization_id)

        result = await db.execute(score_query)
        score = result.scalars().first()

        if score:
            env = float(score.environmental_score)
            soc = float(score.social_score)
            gov = float(score.governance_score)
            overall = float(score.overall_score)
            rating = score.rating
            score_date = str(score.calculation_date)
            data_completeness = float(score.data_completeness or 0)
        else:
            # No score yet — use neutral defaults so we still return useful advice
            env = soc = gov = overall = 50.0
            rating = "C"
            score_date = None
            data_completeness = 0.0

        # ── 2. Count available data entries ───────────────────────────────────
        count_q = select(func.count()).select_from(DataEntry).where(
            DataEntry.tenant_id == user_id
        )
        data_count_res = await db.execute(count_q)
        data_count = data_count_res.scalar() or 0

        # ── 3. Generate recommendations ───────────────────────────────────────
        recommendations = _generate_recommendations(env, soc, gov, data_count)

        # ── 4. Build response ─────────────────────────────────────────────────
        total_gain_est = sum(r["score_gain_est"] for r in recommendations[:5])  # Top 5

        quick_wins = [r for r in recommendations if r["quick_win"]]
        strategic   = [r for r in recommendations if not r["quick_win"]]

        return {
            "scores": {
                "overall": round(overall, 1),
                "environmental": round(env, 1),
                "social": round(soc, 1),
                "governance": round(gov, 1),
                "rating": rating,
                "rating_label": _rating_to_label(rating),
                "score_date": score_date,
                "data_completeness": round(data_completeness, 1),
            },
            "data_count": data_count,
            "strengths": _build_strengths(env, soc, gov),
            "risks": _build_risks(env, soc, gov),
            "recommendations": recommendations,
            "quick_wins": quick_wins[:4],
            "strategic_actions": strategic[:6],
            "total_recommendations": len(recommendations),
            "total_gain_estimate": min(total_gain_est, 40),  # Cap at +40 pts
            "has_score": score is not None,
        }

    except Exception as exc:
        logger.error("AI insights error: %s", exc, exc_info=True)
        # Return graceful empty response
        return {
            "scores": {
                "overall": 0, "environmental": 0, "social": 0, "governance": 0,
                "rating": None, "rating_label": "Non évalué",
                "score_date": None, "data_completeness": 0,
            },
            "data_count": 0,
            "strengths": [],
            "risks": [],
            "recommendations": [],
            "quick_wins": [],
            "strategic_actions": [],
            "total_recommendations": 0,
            "total_gain_estimate": 0,
            "has_score": False,
        }


# ─── OpenAI-powered endpoints ─────────────────────────────────────────────────

ESG_SYSTEM_PROMPT = """Tu es un expert ESG (Environmental, Social, Governance) certifié spécialisé dans la réglementation CSRD/ESRS européenne. 
Tu aides les entreprises à améliorer leur performance ESG, leur reporting CSRD et leur conformité réglementaire.
Réponds en français, de façon concise, structurée et actionnable.
Tes réponses sont basées sur les standards ESRS 2024, GRI, TCFD et la Taxonomie UE.
Si des données ESG de l'organisation sont fournies dans le contexte, utilise-les pour personnaliser tes recommandations."""


@router.post("/chat")
async def ai_chat(
    req: ChatRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Chat with the ESG AI assistant (OpenAI GPT when available, rule-based fallback).
    Automatically enriches context with the user's latest ESG scores.
    """
    client = _get_openai_client()

    # Build context from DB if not provided
    context = req.context or {}
    if not context:
        try:
            score_q = (
                select(ESGScore)
                .where(ESGScore.tenant_id == user_id)
                .order_by(desc(ESGScore.calculation_date))
                .limit(1)
            )
            score_res = await db.execute(score_q)
            score = score_res.scalars().first()
            if score:
                context = {
                    "overall": round(float(score.overall_score), 1),
                    "environmental": round(float(score.environmental_score), 1),
                    "social": round(float(score.social_score), 1),
                    "governance": round(float(score.governance_score), 1),
                    "rating": score.rating,
                }
        except Exception:
            pass

    if client:
        context_str = ""
        if context:
            context_str = (
                f"\n\nDonnées ESG actuelles de l'organisation :\n"
                f"- Score global : {context.get('overall', 'N/A')}/100 (Notation : {context.get('rating', 'N/A')})\n"
                f"- Environnement : {context.get('environmental', 'N/A')}/100\n"
                f"- Social : {context.get('social', 'N/A')}/100\n"
                f"- Gouvernance : {context.get('governance', 'N/A')}/100"
            )

        answer = await _call_openai(
            client,
            ESG_SYSTEM_PROMPT + context_str,
            req.message,
        )
        if answer:
            return {
                "answer": answer,
                "source": "openai",
                "model": getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini'),
                "context_used": bool(context),
            }

    # ── Fallback: rule-based answer ──
    message_lower = req.message.lower()
    fallback_answers = {
        ("score", "améliorer", "augmenter"): (
            "Pour améliorer votre score ESG, concentrez-vous sur 3 axes prioritaires :\n"
            "1. **Environnemental** : Mesurez vos émissions GES (Scopes 1, 2, 3) et fixez des objectifs de réduction\n"
            "2. **Social** : Collectez vos indicateurs RH (turnover, formation, égalité H/F)\n"
            "3. **Gouvernance** : Documentez votre politique ESG et votre dispositif anti-corruption\n\n"
            "Consultez la section 'Recommandations IA' pour un plan personnalisé."
        ),
        ("csrd", "rapport", "reporting"): (
            "Le rapport CSRD nécessite de couvrir les 10 standards ESRS (E1-E5, S1-S4, G1).\n"
            "**Étapes clés :**\n"
            "1. Analyse de matérialité double (impacts + risques financiers)\n"
            "2. Collecte des indicateurs ESRS obligatoires\n"
            "3. Vérification par un commissaire aux comptes tiers\n"
            "4. Publication dans le rapport de gestion\n\n"
            "Utilisez le module 'CSRD Builder' pour générer votre rapport."
        ),
        ("scope", "carbone", "émission", "ges"): (
            "**Scopes d'émissions GES :**\n"
            "- Scope 1 : Émissions directes (combustion, véhicules)\n"
            "- Scope 2 : Électricité et chaleur achetées\n"
            "- Scope 3 : Chaîne de valeur (achats, logistique, usage produits)\n\n"
            "Le Scope 3 représente 70-90% des émissions. Commencez par mesurer les 5 postes principaux."
        ),
    }

    for keywords, answer in fallback_answers.items():
        if any(kw in message_lower for kw in keywords):
            return {
                "answer": answer,
                "source": "rule_based",
                "model": None,
                "context_used": False,
            }

    return {
        "answer": (
            "Je suis votre assistant ESG. Je peux vous aider sur :\n"
            "- L'amélioration de vos scores ESG\n"
            "- La conformité CSRD/ESRS\n"
            "- Les émissions GES et le bilan carbone\n"
            "- Les indicateurs sociaux et de gouvernance\n\n"
            "Configurez votre clé OpenAI API dans les paramètres pour des réponses IA personnalisées."
        ),
        "source": "fallback",
        "model": None,
        "context_used": False,
    }


@router.post("/analyze")
async def ai_analyze(
    req: AnalyzeRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Generate an OpenAI-powered deep analysis for a specific pillar or all pillars.
    Falls back to rule-based summary if OpenAI is unavailable.
    """
    # Fetch scores
    score_q = (
        select(ESGScore)
        .where(ESGScore.tenant_id == user_id)
        .order_by(desc(ESGScore.calculation_date))
        .limit(1)
    )
    score_res = await db.execute(score_q)
    score = score_res.scalars().first()

    if not score:
        raise HTTPException(status_code=404, detail="Aucun score ESG calculé. Calculez d'abord votre score ESG.")

    env   = round(float(score.environmental_score), 1)
    soc   = round(float(score.social_score), 1)
    gov   = round(float(score.governance_score), 1)
    overall = round(float(score.overall_score), 1)
    rating  = score.rating or "N/A"

    # Fetch data entry count
    count_q = select(func.count()).select_from(DataEntry).where(DataEntry.tenant_id == user_id)
    count_res = await db.execute(count_q)
    data_count = count_res.scalar() or 0

    client = _get_openai_client()

    if client:
        pillar_focus = req.pillar or "tous les piliers"
        prompt = (
            f"Analyse approfondie ESG pour une organisation avec les scores suivants :\n"
            f"- Score global : {overall}/100 (Notation {rating})\n"
            f"- Environnemental : {env}/100\n"
            f"- Social : {soc}/100\n"
            f"- Gouvernance : {gov}/100\n"
            f"- Nombre d'indicateurs collectés : {data_count}\n\n"
            f"Fais une analyse détaillée du pilier : **{pillar_focus}**\n"
            f"Structure ta réponse en :\n"
            f"1. Diagnostic (points forts et points faibles)\n"
            f"2. Risques réglementaires CSRD/ESRS associés\n"
            f"3. Plan d'actions priorisé (3-5 actions concrètes avec impact estimé)\n"
            f"4. Indicateurs clés à suivre\n"
        )
        analysis = await _call_openai(client, ESG_SYSTEM_PROMPT, prompt)

        if analysis:
            return {
                "analysis": analysis,
                "source": "openai",
                "pillar": req.pillar,
                "scores": {"overall": overall, "environmental": env, "social": soc, "governance": gov, "rating": rating},
            }

    # Fallback: structured rule-based analysis
    pillar = req.pillar or "all"
    pillar_score = {"environmental": env, "social": soc, "governance": gov}.get(pillar, overall)
    pillar_label = {"environmental": "Environnemental", "social": "Social", "governance": "Gouvernance"}.get(pillar, "Global")

    level = "excellent" if pillar_score >= 75 else ("moyen" if pillar_score >= 50 else "insuffisant")
    analysis_text = (
        f"## Analyse {pillar_label} — {pillar_score}/100\n\n"
        f"**Niveau** : {level.upper()}\n\n"
        f"**Diagnostic** : Votre score {pillar_label} de {pillar_score}/100 est {level}. "
        f"{'Continuez à maintenir vos bonnes pratiques.' if pillar_score >= 75 else 'Des améliorations sont nécessaires pour atteindre la conformité CSRD.'}\n\n"
        f"**Actions prioritaires** :\n"
        + ("- Documenter et publier vos indicateurs ESRS\n- Faire vérifier vos données par un tiers\n- Mettre à jour trimestriellement" if pillar_score >= 60
           else "- Collecter en priorité les indicateurs manquants\n- Définir des objectifs chiffrés\n- Former l'équipe aux exigences CSRD")
    )

    return {
        "analysis": analysis_text,
        "source": "rule_based",
        "pillar": req.pillar,
        "scores": {"overall": overall, "environmental": env, "social": soc, "governance": gov, "rating": rating},
    }

"""
ESG AI Recommendations Service
===============================
Génère 3 recommandations ESG prioritaires structurées en JSON
via l'API OpenAI (gpt-4o-mini).  Si la clé n'est pas configurée,
retourne un ensemble de recommandations règle-métier de fallback.

Format de sortie
----------------
[
  {
    "id": "rec_001",
    "title": "...",
    "description": "...",
    "gain_tco2e": 450.0,       # tonnes CO2e économisées/an (null si non applicable)
    "gain_eur": 28000.0,       # économies annuelles estimées €  (null si non applicable)
    "difficulty": 3,           # 1 (facile) → 5 (très difficile)
    "timeline": "court",       # court (<6 mois) / moyen (6-18 mois) / long (>18 mois)
    "pillar": "environmental", # environmental / social / governance
    "resources": ["Responsable énergie", "Prestataire audit"],
    "kpi": "Émissions Scope 2",
    "priority": "high",        # high / medium / low
    "tags": ["énergie", "scope2"]
  },
  ...
]
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.data_entry import DataEntry
from app.models.esg_score import ESGScore
from app.models.organization import Organization

logger = logging.getLogger(__name__)


# ── Lazy OpenAI import ────────────────────────────────────────────────────────

def _try_openai(api_key: str):
    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key)
    except ImportError:
        logger.warning("openai package not installed")
        return None


# ─── Fallback recommendations (rule-based) ────────────────────────────────────

FALLBACK_RECOMMENDATIONS = [
    {
        "id":          "fallback_001",
        "title":       "Audit énergétique des bâtiments",
        "description": (
            "Réaliser un audit énergétique complet de vos sites principaux pour "
            "identifier les gisements de réduction (isolation, éclairage LED, "
            "systèmes HVAC). Levier majeur pour réduire Scope 1 & 2."
        ),
        "gain_tco2e":  350.0,
        "gain_eur":    25000.0,
        "difficulty":  2,
        "timeline":    "court",
        "pillar":      "environmental",
        "resources":   ["Responsable HSE", "Bureau d'études énergie", "Budget audit ~8 000 €"],
        "kpi":         "Consommation énergie (MWh)",
        "priority":    "high",
        "tags":        ["énergie", "scope1", "scope2", "bâtiment"],
    },
    {
        "id":          "fallback_002",
        "title":       "Programme mobilité durable",
        "description": (
            "Déployer un plan de mobilité : forfait vélo, covoiturage, télétravail "
            "2j/sem. Réduction directe des émissions Scope 3 Catégorie 7 "
            "(trajets domicile-travail) et amélioration du bien-être collaborateurs."
        ),
        "gain_tco2e":  120.0,
        "gain_eur":    9000.0,
        "difficulty":  2,
        "timeline":    "court",
        "pillar":      "social",
        "resources":   ["DRH", "Communication interne", "Budget forfaits ~12 000 €/an"],
        "kpi":         "Émissions Scope 3 Cat.7 (tCO2e)",
        "priority":    "medium",
        "tags":        ["mobilité", "scope3", "rh", "bien-être"],
    },
    {
        "id":          "fallback_003",
        "title":       "Politique achats responsables fournisseurs",
        "description": (
            "Intégrer des critères ESG dans les appels d'offres fournisseurs : "
            "clause carbone, questionnaire RSE, scoring ESG minimum. "
            "Obligatoire pour la conformité CSRD/ESRS S1 et E1."
        ),
        "gain_tco2e":  None,
        "gain_eur":    None,
        "difficulty":  3,
        "timeline":    "moyen",
        "pillar":      "governance",
        "resources":   ["Direction achats", "Juriste", "Consultant RSE"],
        "kpi":         "% fournisseurs évalués ESG",
        "priority":    "medium",
        "tags":        ["achats", "fournisseurs", "csrd", "gouvernance"],
    },
]


# ─── System prompt ────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
Tu es un expert ESG et développement durable pour une plateforme B2B dédiée aux ETI \
et grandes entreprises françaises. Tu génères des recommandations ESG précises, \
actionnables et chiffrées, adaptées au profil de l'entreprise fourni.

RÈGLES IMPÉRATIVES :
1. Retourne UNIQUEMENT un tableau JSON valide de 3 objets, sans texte avant ou après.
2. Chaque objet respecte EXACTEMENT le schéma JSON fourni.
3. Les recommandations sont adaptées au secteur, à la taille et aux piliers ESG faibles.
4. Les gains (gain_tco2e, gain_eur) sont réalistes pour le contexte donné (null si non chiffrable).
5. difficulty est un entier entre 1 et 5.
6. timeline est exactement "court", "moyen" ou "long".
7. priority est exactement "high", "medium" ou "low".
8. pillar est exactement "environmental", "social" ou "governance".
9. Les resources sont 2–4 éléments concrets (rôles, budgets, outils).
10. Les recommandations couvrent les 3 piliers ESG si possible.
"""

_USER_PROMPT_TEMPLATE = """\
Profil de l'entreprise :
{profile_json}

Schéma JSON attendu pour chaque recommandation :
{{
  "id": "rec_001",
  "title": "Titre court et percutant (< 60 chars)",
  "description": "Description actionnable 2-3 phrases expliquant le quoi et le pourquoi",
  "gain_tco2e": <float ou null>,
  "gain_eur": <float ou null>,
  "difficulty": <int 1-5>,
  "timeline": "<court|moyen|long>",
  "pillar": "<environmental|social|governance>",
  "resources": ["Ressource 1", "Ressource 2"],
  "kpi": "Nom de l'indicateur principal impacté",
  "priority": "<high|medium|low>",
  "tags": ["tag1", "tag2"]
}}

Génère 3 recommandations prioritaires en JSON strict.
"""


# ─── ESGRecommendationService ─────────────────────────────────────────────────

class ESGRecommendationService:
    """
    Generate ESG recommendations using OpenAI API with rule-based fallback.

    Usage::
        svc = ESGRecommendationService(db, openai_api_key="sk-...")
        recommendations = await svc.generate_recommendations(tenant_id)
    """

    def __init__(self, db: AsyncSession, openai_api_key: Optional[str] = None, model: str = "gpt-4o-mini") -> None:
        self.db          = db
        self.api_key     = openai_api_key
        self.model       = model

    # ── Public API ─────────────────────────────────────────────────────────────

    async def generate_recommendations(
        self,
        tenant_id:    UUID,
        organization_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        """
        Build company profile, call OpenAI, return structured recommendations.
        Falls back to rule-based recommendations if API key not set.
        """
        profile = await self._build_company_profile(tenant_id, organization_id)
        ai_used = False
        recommendations: List[Dict[str, Any]] = []

        if self.api_key:
            recommendations = await self._call_openai(profile)
            ai_used = bool(recommendations)

        if not recommendations:
            recommendations = self._rule_based_recommendations(profile)
            logger.info("Using rule-based recommendations (OpenAI not configured or failed)")

        return {
            "recommendations":  recommendations,
            "company_profile":  profile,
            "ai_generated":     ai_used,
            "model":            self.model if ai_used else "rule-based",
            "count":            len(recommendations),
        }

    # ── Profile builder ────────────────────────────────────────────────────────

    async def _build_company_profile(
        self,
        tenant_id:       UUID,
        organization_id: Optional[UUID],
    ) -> Dict[str, Any]:
        """Aggregate ESG data into a compact company profile for the prompt."""
        # Latest ESG scores
        score_q = (
            select(ESGScore)
            .where(ESGScore.tenant_id == tenant_id)
            .order_by(ESGScore.calculation_date.desc())
            .limit(1)
        )
        score_res = await self.db.execute(score_q)
        latest_score = score_res.scalars().first()

        # Latest data entries for top emitters
        entry_q = (
            select(DataEntry)
            .where(DataEntry.tenant_id == tenant_id)
            .where(DataEntry.value_numeric.isnot(None))
            .order_by(DataEntry.value_numeric.desc())
            .limit(10)
        )
        entry_res = await self.db.execute(entry_q)
        top_entries = entry_res.scalars().all()

        # Organization info
        org_q  = select(Organization).where(Organization.tenant_id == tenant_id).limit(1)
        org_r  = await self.db.execute(org_q)
        org    = org_r.scalars().first()

        # Data completeness
        total_q = select(func.count()).select_from(DataEntry).where(DataEntry.tenant_id == tenant_id)
        verified_q = (
            select(func.count())
            .select_from(DataEntry)
            .where(DataEntry.tenant_id == tenant_id)
            .where(DataEntry.verification_status == "verified")
        )
        total_r    = await self.db.execute(total_q)
        verified_r = await self.db.execute(verified_q)
        total_count    = total_r.scalar() or 0
        verified_count = verified_r.scalar() or 0

        # Top emitters (metric name + value)
        top_emitters = [
            {"metric": e.metric_name, "value": e.value_numeric, "unit": getattr(e, "unit", ""), "pillar": e.pillar}
            for e in top_entries[:5]
        ]

        profile: Dict[str, Any] = {
            "sector":            getattr(org, "industry", "Non précisé") if org else "Non précisé",
            "org_type":          getattr(org, "org_type", "company") if org else "company",
            "data_completeness_pct": round(verified_count / max(total_count, 1) * 100, 1),
            "total_data_points": total_count,
        }

        if latest_score:
            profile["scores"] = {
                "environmental": round(float(latest_score.environmental_score or 0), 1),
                "social":        round(float(latest_score.social_score or 0), 1),
                "governance":    round(float(latest_score.governance_score or 0), 1),
                "overall":       round(float(latest_score.overall_score or 0), 1),
                "grade":         getattr(latest_score, "grade", "N/A"),
            }
            # Weakest pillar
            scores = {
                "environmental": float(latest_score.environmental_score or 0),
                "social":        float(latest_score.social_score or 0),
                "governance":    float(latest_score.governance_score or 0),
            }
            profile["weakest_pillar"] = min(scores, key=scores.get)
        else:
            profile["scores"] = None
            profile["weakest_pillar"] = None

        profile["top_emitters"] = top_emitters

        return profile

    # ── OpenAI call ────────────────────────────────────────────────────────────

    async def _call_openai(self, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Call OpenAI and parse the JSON response."""
        client = _try_openai(self.api_key)
        if client is None:
            return []

        profile_json = json.dumps(profile, ensure_ascii=False, indent=2)
        user_prompt  = _USER_PROMPT_TEMPLATE.format(profile_json=profile_json)

        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user",   "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.4,
                max_tokens=2000,
            )
            raw = response.choices[0].message.content or ""
            parsed = json.loads(raw)

            # Handle both {"recommendations": [...]} and direct list
            if isinstance(parsed, list):
                recs = parsed
            elif isinstance(parsed, dict):
                recs = parsed.get("recommendations", list(parsed.values())[0] if parsed else [])
            else:
                recs = []

            return self._validate_recommendations(recs)

        except Exception as exc:
            logger.error("OpenAI call failed: %s", exc)
            return []

    def _validate_recommendations(self, recs: List[Any]) -> List[Dict[str, Any]]:
        """Ensure each recommendation has required fields with valid values."""
        valid: List[Dict[str, Any]] = []
        for i, r in enumerate(recs[:3]):
            if not isinstance(r, dict):
                continue
            # Coerce & default
            r.setdefault("id",         f"rec_{i+1:03d}")
            r.setdefault("title",      "Recommandation ESG")
            r.setdefault("description","")
            r.setdefault("gain_tco2e", None)
            r.setdefault("gain_eur",   None)
            r["difficulty"] = max(1, min(5, int(r.get("difficulty", 3))))
            r["timeline"]   = r.get("timeline", "moyen") if r.get("timeline") in ("court", "moyen", "long") else "moyen"
            r["pillar"]     = r.get("pillar", "environmental") if r.get("pillar") in ("environmental", "social", "governance") else "environmental"
            r["priority"]   = r.get("priority", "medium") if r.get("priority") in ("high", "medium", "low") else "medium"
            r.setdefault("resources", [])
            r.setdefault("kpi",  "")
            r.setdefault("tags", [])
            valid.append(r)
        return valid

    # ── Rule-based fallback ────────────────────────────────────────────────────

    def _rule_based_recommendations(self, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Select and customise fallback recommendations based on profile.
        Prioritises the weakest pillar.
        """
        recs = list(FALLBACK_RECOMMENDATIONS)

        # Reorder: weakest pillar first
        weakest = profile.get("weakest_pillar")
        if weakest:
            recs.sort(key=lambda r: (0 if r["pillar"] == weakest else 1))

        # If data completeness is low, prepend a data quality recommendation
        if profile.get("data_completeness_pct", 100) < 50:
            recs.insert(0, {
                "id":          "rule_data_quality",
                "title":       "Améliorer la complétude des données ESG",
                "description": (
                    f"Votre taux de complétion est de {profile['data_completeness_pct']}%. "
                    "Complétez et vérifiez vos données pour améliorer la fiabilité "
                    "du reporting et le calcul des scores ESG."
                ),
                "gain_tco2e":  None,
                "gain_eur":    None,
                "difficulty":  1,
                "timeline":    "court",
                "pillar":      "governance",
                "resources":   ["Responsable RSE", "Équipe data"],
                "kpi":         "Taux de complétude des données (%)",
                "priority":    "high",
                "tags":        ["données", "qualité", "csrd"],
            })

        return recs[:3]

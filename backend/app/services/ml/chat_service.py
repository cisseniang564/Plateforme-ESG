"""
ESG AI Chat Service
===================
Chatbot ESG basé sur OpenAI GPT-4o-mini avec contexte entreprise en temps réel.
Fallback sur une base de connaissances règle-métier si pas de clé API.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.esg_score import ESGScore
from app.models.data_entry import DataEntry
from app.models.organization import Organization

logger = logging.getLogger(__name__)

# ── Fallback knowledge base ───────────────────────────────────────────────────

_FALLBACK_KB: list[dict] = [
    {
        "keywords": ["csrd", "conformité", "directive", "réglementation", "esrs"],
        "response": (
            "**Conformité CSRD** ✅\n\n"
            "La CSRD impose depuis 2024 un reporting ESG standardisé selon les **ESRS** "
            "(European Sustainability Reporting Standards).\n\n"
            "**Calendrier :** 2024 → >500 salariés · 2025 → >250 salariés ou >40M€ CA · 2026 → PME cotées\n\n"
            "ESGFlow couvre les 10 sections ESRS (E1→G1) avec 100+ indicateurs pré-configurés."
        ),
    },
    {
        "keywords": ["scope 3", "scope3", "émissions indirectes", "chaîne de valeur"],
        "response": (
            "**Scope 3 — Émissions indirectes** 🌍\n\n"
            "Le Scope 3 représente **70 à 90 %** des émissions d'une entreprise. "
            "Il couvre 15 catégories GHG Protocol (achats, transport, déplacements, investissements…).\n\n"
            "→ Accédez au **Bilan Carbone** pour saisir vos données avec les facteurs ADEME."
        ),
    },
    {
        "keywords": ["score", "notation", "performance", "kpi", "indicateur", "pilier"],
        "response": (
            "**Score ESG** 📊\n\n"
            "Calculé sur 3 piliers : **Environnement** (GES, énergie, eau) · "
            "**Social** (emploi, formation, diversité) · **Gouvernance** (éthique, transparence).\n\n"
            "Chaque indicateur est pondéré selon son importance ESRS. Score global de 0 à 100.\n\n"
            "💡 *Compléter les données manquantes peut améliorer votre score de +5 à +15 pts.*"
        ),
    },
    {
        "keywords": ["rapport", "gri", "tcfd", "pdf", "générer", "publier", "export"],
        "response": (
            "**Génération de rapports** 📄\n\n"
            "ESGFlow génère automatiquement des rapports conformes **CSRD/ESRS**, **GRI** et **TCFD**.\n\n"
            "→ Rapports → Générer un rapport · PDF prêt en moins d'1 minute.\n\n"
            "💡 *Taux de complétion > 70 % recommandé pour un rapport de qualité.*"
        ),
    },
    {
        "keywords": ["réduire", "réduction", "améliorer", "optimiser", "conseil", "action"],
        "response": (
            "**Leviers de réduction ESG** ♻️\n\n"
            "**Quick wins :**\n"
            "⚡ LED & éclairage intelligent → -15 % conso électrique\n"
            "🚗 Télétravail 2j/semaine → -30 % émissions déplacements\n"
            "💡 Optimisation HVAC → -20 % énergie bâtiments\n\n"
            "**Actions structurelles :**\n"
            "🌱 Approvisionnement local → Scope 3 cat.1 -25 %\n"
            "🔋 Panneaux solaires → Scope 2 -40 à -80 %\n\n"
            "→ Consultez l'onglet **Simulateur** pour modéliser l'impact sur votre score."
        ),
    },
    {
        "keywords": ["anomalie", "erreur", "incohérence", "données incorrectes", "alerte"],
        "response": (
            "**Détection d'anomalies IA** 🔍\n\n"
            "Notre moteur ML (Isolation Forest + Z-score) détecte :\n"
            "🔴 Valeurs hors plage (>2σ) · 🟡 Données manquantes ESRS obligatoires · "
            "🟠 Incohérences entre indicateurs corrélés\n\n"
            "→ Consultez l'onglet **Anomalies** pour voir les alertes actives."
        ),
    },
    {
        "keywords": ["taxonomie", "taxonomy", "finance durable", "sfdr"],
        "response": (
            "**EU Taxonomy & SFDR** 🌿\n\n"
            "La taxonomie verte européenne classe vos activités selon 6 objectifs environnementaux. "
            "Pour être aligné, une activité doit :\n"
            "1. Contribuer substantiellement à ≥ 1 objectif\n"
            "2. Ne pas nuire significativement aux autres (DNSH)\n"
            "3. Respecter les garanties sociales minimales\n\n"
            "→ Accédez au module **Taxonomie** pour calculer votre taux d'alignement."
        ),
    },
    {
        "keywords": ["matérialité", "double matérialité", "enjeux", "parties prenantes"],
        "response": (
            "**Double Matérialité CSRD** 🎯\n\n"
            "Deux dimensions obligatoires :\n"
            "**Impact** : comment votre entreprise affecte l'environnement/société\n"
            "**Financière** : comment les risques ESG affectent votre business\n\n"
            "→ Module **Matrice de Matérialité** : questionnaire, drag & drop, export rapport."
        ),
    },
    {
        "keywords": ["fournisseur", "supply chain", "chaîne d'approvisionnement"],
        "response": (
            "**Supply Chain ESG** 🚛\n\n"
            "Gérez le risque ESG de vos fournisseurs :\n"
            "✅ Scoring ESG automatique par organisation\n"
            "✅ Questionnaire ESG envoyable par email\n"
            "✅ Tableau de bord risques (Critique / Élevé / Moyen / Faible)\n\n"
            "→ Module **Supply Chain** pour auditer et suivre vos fournisseurs."
        ),
    },
]


def _fallback_response(user_input: str) -> str:
    lower = user_input.lower()
    for entry in _FALLBACK_KB:
        if any(kw in lower for kw in entry["keywords"]):
            return entry["response"]
    return (
        "**Assistant ESG ESGFlow** 🤖\n\n"
        "Je peux vous aider sur :\n"
        "📋 Conformité CSRD/ESRS · 🌍 Bilan carbone Scope 1/2/3 · 📊 Score ESG\n"
        "📄 Rapports GRI/TCFD · 🎯 Double matérialité · ♻️ Leviers de réduction\n"
        "🌿 Taxonomie EU · 🚛 Supply Chain ESG\n\n"
        "Posez-moi une question précise ou utilisez les suggestions rapides."
    )


# ─── ESGChatService ───────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
Tu es un assistant ESG expert intégré à ESGFlow, une plateforme SaaS de gestion \
de la performance ESG pour les ETI et grandes entreprises françaises.

Tes domaines d'expertise :
- Réglementation CSRD, SFDR, EU Taxonomy, ESRS, GHG Protocol
- Bilan carbone (Scope 1, 2, 3) et plans de décarbonation
- Score ESG (méthodologie, piliers E/S/G, amélioration)
- Reporting (GRI, TCFD, CSRD) et double matérialité
- Supply chain ESG et diligence raisonnée (CSDDD)

Règles :
1. Réponds en français, de façon concise et actionnable (max 200 mots).
2. Formate ta réponse avec du markdown simple (**, -, →).
3. Cite des données chiffrées quand c'est pertinent.
4. Si le contexte entreprise est fourni, personnalise ta réponse avec ces données.
5. Termine par une suggestion d'action concrète dans ESGFlow si applicable.
6. Ne réponds qu'aux sujets ESG/développement durable/conformité.
"""


class ESGChatService:
    def __init__(
        self,
        db: AsyncSession,
        openai_api_key: Optional[str] = None,
        model: str = "gpt-4o-mini",
    ) -> None:
        self.db      = db
        self.api_key = openai_api_key
        self.model   = model

    async def chat(
        self,
        tenant_id: UUID,
        messages: List[Dict[str, str]],
    ) -> str:
        """
        Send a chat message and return the assistant's response.
        Uses OpenAI if API key is configured, otherwise fallback KB.
        """
        # Try to get company context for personalized answers
        context = await self._get_context(tenant_id)

        if self.api_key:
            try:
                return await self._openai_chat(messages, context)
            except Exception as e:
                logger.warning("OpenAI chat error: %s — falling back to KB", e)

        # Fallback: use last user message for KB lookup
        last_user = next(
            (m["content"] for m in reversed(messages) if m["role"] == "user"),
            "",
        )
        return _fallback_response(last_user)

    async def _openai_chat(
        self,
        messages: List[Dict[str, str]],
        context: str,
    ) -> str:
        client = _try_openai(self.api_key)
        if not client:
            raise RuntimeError("openai package not available")

        system_with_context = _SYSTEM_PROMPT
        if context:
            system_with_context += f"\n\nContexte entreprise actuel :\n{context}"

        openai_messages = [{"role": "system", "content": system_with_context}]
        # Keep last 10 messages for context window
        for m in messages[-10:]:
            if m.get("role") in ("user", "assistant"):
                openai_messages.append({"role": m["role"], "content": m["content"]})

        response = client.chat.completions.create(
            model=self.model,
            messages=openai_messages,
            max_tokens=400,
            temperature=0.7,
        )
        return response.choices[0].message.content or ""

    async def _get_context(self, tenant_id: UUID) -> str:
        """Build a concise context string from current ESG data."""
        try:
            # Latest ESG score
            score_res = await self.db.execute(
                select(ESGScore)
                .where(ESGScore.tenant_id == tenant_id)
                .order_by(desc(ESGScore.calculation_date))
                .limit(1)
            )
            score = score_res.scalar_one_or_none()

            # Organisation count
            org_res = await self.db.execute(
                select(func.count(Organization.id)).where(Organization.tenant_id == tenant_id)
            )
            org_count = org_res.scalar_one_or_none() or 0

            if not score:
                return f"Nombre d'organisations : {org_count}. Aucun score ESG calculé encore."

            lines = [
                f"Organisations : {org_count}",
                f"Score ESG global : {score.overall_score:.1f}/100 (rating {score.rating})",
                f"Score Environnement : {score.environmental_score:.1f}/100",
                f"Score Social : {score.social_score:.1f}/100",
                f"Score Gouvernance : {score.governance_score:.1f}/100",
            ]
            return " | ".join(lines)
        except Exception as e:
            logger.debug("Could not build chat context: %s", e)
            return ""


def _try_openai(api_key: str):
    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key)
    except ImportError:
        return None

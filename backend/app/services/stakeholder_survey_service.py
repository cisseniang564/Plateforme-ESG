"""
Stakeholder Survey templates & analytics.

Templates encode "who cares about what":
each stakeholder category (employee / customer / supplier / investor) gets a
curated list of ESRS topics to score, with French-language guidance prompts.

Analytics aggregate per-topic average scores across all responses (overall +
broken down by stakeholder category) so the matrix can be regenerated and
fed back into the double-materiality assessment (ESRS 2 SBM-3).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.stakeholder_survey import StakeholderSurvey, StakeholderResponse


# ────────────────────────────────────────────────────────────────────────────
# Templates
# ────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class SurveyTemplate:
    """A predefined set of ESRS topics tailored to a stakeholder category."""
    code: str
    label_fr: str
    description_fr: str
    topics: List[str]
    audience_hint_fr: str

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "label_fr": self.label_fr,
            "description_fr": self.description_fr,
            "topics": self.topics,
            "audience_hint_fr": self.audience_hint_fr,
        }


TEMPLATES: List[SurveyTemplate] = [
    SurveyTemplate(
        code="employee",
        label_fr="Employés / salariés",
        description_fr=(
            "Sondage destiné aux salariés et travailleurs internes pour évaluer "
            "les enjeux ESG perçus depuis l'intérieur — conditions de travail, "
            "gouvernance, transition climatique vécue."
        ),
        # Heavy weight on S1, balance with E1 and G1.
        topics=["S1", "E1", "G1", "E5", "S2"],
        audience_hint_fr=(
            "Diffusez le lien via l'intranet, Slack/Teams ou la newsletter RH. "
            "Garantissez l'anonymat des réponses pour augmenter la sincérité."
        ),
    ),
    SurveyTemplate(
        code="customer",
        label_fr="Clients / consommateurs",
        description_fr=(
            "Sondage destiné aux clients (B2C ou B2B) pour évaluer l'importance "
            "des enjeux ESG dans leur décision d'achat et leur perception de "
            "votre engagement durabilité."
        ),
        topics=["E1", "E5", "S4", "G1", "E2"],
        audience_hint_fr=(
            "Insérez le lien dans une campagne email ou une page \"Notre démarche RSE\". "
            "Limitez le sondage à 5-8 questions pour maximiser le taux de réponse."
        ),
    ),
    SurveyTemplate(
        code="supplier",
        label_fr="Fournisseurs / partenaires",
        description_fr=(
            "Sondage destiné aux fournisseurs pour évaluer la maturité ESG de "
            "la chaîne d'approvisionnement et identifier les risques de "
            "transition (G1 anti-corruption, S2 conditions de travail amont)."
        ),
        topics=["G1", "S2", "E1", "E2", "E5"],
        audience_hint_fr=(
            "Envoi nominatif via la centrale achats. Indispensable pour la due "
            "diligence CSDDD (Directive sur le devoir de vigilance) et G1-6 "
            "(pratiques de paiement)."
        ),
    ),
    SurveyTemplate(
        code="investor",
        label_fr="Investisseurs / actionnaires",
        description_fr=(
            "Sondage destiné aux investisseurs institutionnels et actionnaires "
            "pour comprendre quels enjeux ESG ils considèrent comme financièrement "
            "matériels — pivot pour la double-matérialité."
        ),
        topics=["E1", "E5", "G1", "S1", "S4"],
        audience_hint_fr=(
            "À envoyer en amont de l'AG ou lors des roadshows. Les réponses "
            "alimentent directement l'axe \"matérialité financière\" de la matrice."
        ),
    ),
    SurveyTemplate(
        code="custom",
        label_fr="Personnalisé",
        description_fr="Choisissez manuellement les thèmes ESRS à évaluer.",
        topics=[],
        audience_hint_fr="Configurez librement les thèmes et la cible.",
    ),
]


def get_template(code: str) -> Optional[SurveyTemplate]:
    for t in TEMPLATES:
        if t.code == code:
            return t
    return None


# ────────────────────────────────────────────────────────────────────────────
# Analytics
# ────────────────────────────────────────────────────────────────────────────

async def compute_analytics(
    db: AsyncSession,
    survey: StakeholderSurvey,
) -> Dict:
    """
    Aggregate response ratings into per-topic averages.

    Returns
    -------
    {
      "summary": {
          "response_count": int,
          "expected_count": int,
          "response_rate": float,    # 0..1
          "categories":   {"employee": 12, "client": 8, ...},
      },
      "topics": [
        {
          "code": "E1",
          "impact_avg": 4.2,
          "financial_avg": 3.8,
          "samples": 25,
          "by_category": {
              "employee": {"impact_avg": 4.5, "financial_avg": 3.6, "samples": 12},
              "client":   {"impact_avg": 3.9, "financial_avg": 4.1, "samples": 8},
              ...
          },
        },
        ...
      ],
      "comments": [
        {"category": "employee", "comment": "...", "submitted_at": "..."}, ...
      ]
    }

    The output is the same shape the materiality matrix expects so we can
    pipe it back into the double-materiality scoring pipeline directly.
    """
    # Eagerly load responses
    q = select(StakeholderResponse).where(StakeholderResponse.survey_id == survey.id)
    rows = (await db.execute(q)).scalars().all()

    # Compute totals
    response_count = len(rows)
    expected_count = len(survey.invitations or []) or response_count

    cat_counts: Dict[str, int] = {}
    for r in rows:
        cat_counts[r.respondent_category] = cat_counts.get(r.respondent_category, 0) + 1

    # Per-topic stats
    topic_stats: Dict[str, Dict] = {}
    for code in survey.topics or []:
        # global
        impacts: List[float] = []
        finlist: List[float] = []
        by_cat: Dict[str, Dict[str, List[float]]] = {}
        for r in rows:
            rating = (r.ratings or {}).get(code) or {}
            if "impact" in rating:
                try:
                    impacts.append(float(rating["impact"]))
                    cat = r.respondent_category or "other"
                    by_cat.setdefault(cat, {"impact": [], "financial": []})["impact"].append(float(rating["impact"]))
                except (TypeError, ValueError):
                    pass
            if "financial" in rating:
                try:
                    finlist.append(float(rating["financial"]))
                    cat = r.respondent_category or "other"
                    by_cat.setdefault(cat, {"impact": [], "financial": []})["financial"].append(float(rating["financial"]))
                except (TypeError, ValueError):
                    pass

        def avg(lst: List[float]) -> Optional[float]:
            return round(sum(lst) / len(lst), 2) if lst else None

        topic_stats[code] = {
            "code": code,
            "impact_avg":    avg(impacts),
            "financial_avg": avg(finlist),
            "samples":       len(impacts) or len(finlist),
            "by_category": {
                cat: {
                    "impact_avg":    avg(v["impact"]),
                    "financial_avg": avg(v["financial"]),
                    "samples":       max(len(v["impact"]), len(v["financial"])),
                } for cat, v in by_cat.items()
            },
        }

    # Free-text comments (latest 50)
    comments = sorted(
        [
            {
                "category":      r.respondent_category,
                "comment":       r.free_text,
                "submitted_at":  r.submitted_at.isoformat() if r.submitted_at else None,
            }
            for r in rows if r.free_text and r.free_text.strip()
        ],
        key=lambda x: x.get("submitted_at") or "",
        reverse=True,
    )[:50]

    return {
        "summary": {
            "response_count": response_count,
            "expected_count": expected_count,
            "response_rate":  round(response_count / expected_count, 3) if expected_count > 0 else 0.0,
            "categories":     cat_counts,
        },
        "topics": list(topic_stats.values()),
        "comments": comments,
    }

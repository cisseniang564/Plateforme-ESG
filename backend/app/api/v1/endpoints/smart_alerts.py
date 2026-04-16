"""
Smart Alerts — rule-based ESG alert engine.
Analyses latest scores, data freshness and ESRS coverage to surface
actionable in-app alerts without requiring a real AI/LLM call.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id, get_current_tenant_id
from app.models.esg_score import ESGScore
from app.models.data_entry import DataEntry

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Alert helpers ─────────────────────────────────────────────────────────────

def _alert(
    id_: str,
    type_: str,
    title: str,
    message: str,
    pillar: Optional[str] = None,
    action_label: str = "Voir",
    action_href: str = "/app/dashboard",
) -> Dict[str, Any]:
    return {
        "id": id_,
        "type": type_,          # "critical" | "warning" | "info"
        "title": title,
        "message": message,
        "pillar": pillar,
        "action_label": action_label,
        "action_href": action_href,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


# ─── Route ─────────────────────────────────────────────────────────────────────

@router.get("")
async def get_smart_alerts(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Generate rule-based ESG alerts for the current tenant.
    Returns at most ~10 relevant alerts sorted by severity.
    """
    alerts: List[Dict[str, Any]] = []

    try:
        # ── 1. Fetch 2 latest scores (to detect drops) ─────────────────────────
        score_q = (
            select(ESGScore)
            .where(ESGScore.tenant_id == tenant_id)
            .order_by(desc(ESGScore.calculation_date))
            .limit(2)
        )
        score_res = await db.execute(score_q)
        scores = score_res.scalars().all()

        latest: Optional[ESGScore] = scores[0] if scores else None
        previous: Optional[ESGScore] = scores[1] if len(scores) > 1 else None

        if latest is None:
            alerts.append(_alert(
                "no_score",
                "warning",
                "Aucun score ESG calculé",
                "Calculez votre premier score ESG pour suivre votre performance et générer des recommandations.",
                action_label="Calculer un score",
                action_href="/app/scores/calculate",
            ))
        else:
            env = float(latest.environmental_score)
            soc = float(latest.social_score)
            gov = float(latest.governance_score)
            overall = float(latest.overall_score)
            completeness = float(latest.data_completeness or 0)

            # Critical overall score
            if overall < 35:
                alerts.append(_alert(
                    "score_critical",
                    "critical",
                    f"Score ESG global critique : {round(overall)}/100",
                    "Votre score est en dessous du seuil acceptable. Des actions correctives urgentes sont nécessaires.",
                    action_label="Voir les recommandations",
                    action_href="/app/ai-insights",
                ))
            elif overall < 50:
                alerts.append(_alert(
                    "score_low",
                    "warning",
                    f"Score ESG global insuffisant : {round(overall)}/100",
                    "Votre score global est en dessous de la moyenne. Consultez les recommandations IA pour des pistes d'amélioration.",
                    action_label="Insights IA",
                    action_href="/app/ai-insights",
                ))

            # Pillar-specific low scores
            if env < 40:
                alerts.append(_alert(
                    "env_critical", "critical",
                    f"Score Environnemental critique : {round(env)}/100",
                    "Le pilier Environnemental nécessite une attention urgente — émissions, énergie et eau.",
                    pillar="environmental",
                    action_label="Voir le Bilan Carbone",
                    action_href="/app/carbon",
                ))
            elif env < 55:
                alerts.append(_alert(
                    "env_low", "warning",
                    f"Score Environnemental faible : {round(env)}/100",
                    "Améliorez vos indicateurs environnementaux : mesure des Scopes 1, 2 et 3.",
                    pillar="environmental",
                    action_label="Bilan Carbone",
                    action_href="/app/carbon",
                ))

            if soc < 40:
                alerts.append(_alert(
                    "soc_critical", "critical",
                    f"Score Social critique : {round(soc)}/100",
                    "Le pilier Social nécessite une intervention urgente — sécurité, égalité, formation.",
                    pillar="social",
                    action_label="Insights IA",
                    action_href="/app/ai-insights",
                ))
            elif soc < 55:
                alerts.append(_alert(
                    "soc_low", "warning",
                    f"Score Social insuffisant : {round(soc)}/100",
                    "Renforcez vos indicateurs RH et sociaux pour améliorer ce pilier.",
                    pillar="social",
                    action_label="Voir les données",
                    action_href="/app/data-entry",
                ))

            if gov < 40:
                alerts.append(_alert(
                    "gov_critical", "critical",
                    f"Score Gouvernance critique : {round(gov)}/100",
                    "La gouvernance est insuffisante — politiques ESG, transparence et anti-corruption.",
                    pillar="governance",
                    action_label="Insights IA",
                    action_href="/app/ai-insights",
                ))
            elif gov < 55:
                alerts.append(_alert(
                    "gov_low", "warning",
                    f"Score Gouvernance insuffisant : {round(gov)}/100",
                    "Formalisez votre politique ESG et améliorez votre dispositif de gouvernance.",
                    pillar="governance",
                    action_label="Insights IA",
                    action_href="/app/ai-insights",
                ))

            # Score drops vs previous calculation
            if previous:
                prev_overall = float(previous.overall_score)
                drop = prev_overall - overall
                if drop >= 10:
                    alerts.append(_alert(
                        "score_drop", "critical",
                        f"Score ESG en chute : -{round(drop)} pts",
                        f"Votre score est passé de {round(prev_overall)} à {round(overall)} depuis le dernier calcul. Analysez les causes.",
                        action_label="Comparer les scores",
                        action_href="/app/scores/history",
                    ))
                elif drop >= 5:
                    alerts.append(_alert(
                        "score_decline", "warning",
                        f"Score ESG en baisse : -{round(drop)} pts",
                        f"Légère baisse depuis la dernière évaluation ({round(prev_overall)} → {round(overall)}). Surveillez vos indicateurs.",
                        action_label="Historique",
                        action_href="/app/scores/history",
                    ))

            # Data completeness
            if completeness < 40:
                alerts.append(_alert(
                    "data_completeness_critical", "critical",
                    f"Complétude des données : {round(completeness)}%",
                    "Moins de 40% de vos indicateurs ESG sont renseignés. La fiabilité de votre score est très faible.",
                    action_label="Saisir des données",
                    action_href="/app/data-entry",
                ))
            elif completeness < 60:
                alerts.append(_alert(
                    "data_completeness_low", "warning",
                    f"Complétude des données insuffisante : {round(completeness)}%",
                    "Enrichissez votre base de données ESG pour améliorer la fiabilité de votre score.",
                    action_label="Saisir des données",
                    action_href="/app/data-entry",
                ))

        # ── 2. Check data freshness (last 30 days) ────────────────────────────
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        count_q = select(func.count()).select_from(DataEntry).where(
            DataEntry.tenant_id == tenant_id,
            DataEntry.created_at >= cutoff,
        )
        count_res = await db.execute(count_q)
        recent_count = count_res.scalar() or 0

        if recent_count == 0:
            alerts.append(_alert(
                "data_stale", "warning",
                "Aucune donnée saisie depuis 30 jours",
                "Aucun indicateur ESG n'a été enregistré depuis un mois. Pensez à mettre à jour vos données.",
                action_label="Saisir des données",
                action_href="/app/data-entry",
            ))

        # ── 3. CSRD deadline proximity ─────────────────────────────────────────
        now = datetime.now(timezone.utc)
        csrd_deadline = datetime(2026, 12, 31, tzinfo=timezone.utc)
        days_left = (csrd_deadline - now).days
        if days_left <= 90:
            alerts.append(_alert(
                "csrd_deadline", "critical",
                f"Échéance CSRD dans {days_left} jours",
                "La date limite de publication du rapport CSRD approche. Vérifiez votre couverture ESRS.",
                action_label="Analyse ESRS",
                action_href="/app/esrs-gap",
            ))
        elif days_left <= 180:
            alerts.append(_alert(
                "csrd_deadline_soon", "warning",
                f"Échéance CSRD dans {days_left} jours",
                "Anticipez la publication de votre rapport CSRD en complétant l'analyse ESRS.",
                action_label="Analyse ESRS",
                action_href="/app/esrs-gap",
            ))

    except Exception as exc:
        logger.error("Smart alerts error: %s", exc, exc_info=True)
        # Return empty — never crash the frontend

    # Sort: critical first, then warning, then info
    order = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: order.get(a["type"], 9))

    return {
        "alerts": alerts[:10],  # cap at 10
        "total": len(alerts),
        "critical_count": sum(1 for a in alerts if a["type"] == "critical"),
        "warning_count": sum(1 for a in alerts if a["type"] == "warning"),
        "info_count": sum(1 for a in alerts if a["type"] == "info"),
    }

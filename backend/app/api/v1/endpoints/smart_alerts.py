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
from app.models.user import User

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


@router.post("/send-digest")
async def send_alert_digest(
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Send an email digest of current smart alerts to the requesting user."""
    from app.services.email_service import EmailService

    # Get user email
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        return {"sent": False, "reason": "user_not_found"}

    # Re-run alert logic inline (lightweight — no DB round-trip budget concern)
    alerts: List[Dict[str, Any]] = []
    try:
        score_q = (
            select(ESGScore)
            .where(ESGScore.tenant_id == tenant_id)
            .order_by(desc(ESGScore.calculated_at))
            .limit(1)
        )
        score_res = await db.execute(score_q)
        latest = score_res.scalar_one_or_none()

        if latest:
            if latest.total_score < 40:
                alerts.append(_alert("score_critical", "critical",
                    f"Score ESG critique : {round(latest.total_score)}/100",
                    "Votre score ESG est en zone critique. Des actions correctives urgentes sont nécessaires.",
                    action_href="/app/scores"))
            elif latest.total_score < 60:
                alerts.append(_alert("score_warning", "warning",
                    f"Score ESG insuffisant : {round(latest.total_score)}/100",
                    "Votre score ESG est en dessous du seuil recommandé de 60/100.",
                    action_href="/app/scores"))

        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        count_q = select(func.count()).select_from(DataEntry).where(
            DataEntry.tenant_id == tenant_id,
            DataEntry.created_at >= cutoff,
        )
        count_res = await db.execute(count_q)
        if (count_res.scalar() or 0) == 0:
            alerts.append(_alert("data_stale", "warning",
                "Aucune donnée saisie depuis 30 jours",
                "Aucun indicateur ESG n'a été enregistré depuis un mois.",
                action_href="/app/data-entry"))

        now = datetime.now(timezone.utc)
        days_left = (datetime(2026, 12, 31, tzinfo=timezone.utc) - now).days
        if days_left <= 180:
            alerts.append(_alert("csrd_deadline", "critical" if days_left <= 90 else "warning",
                f"Echeance CSRD dans {days_left} jours",
                "La date limite de publication du rapport CSRD approche.",
                action_href="/app/esrs-gap"))

    except Exception as exc:
        logger.error("Alert digest generation error: %s", exc)

    if not alerts:
        return {"sent": False, "reason": "no_alerts"}

    order = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: order.get(a["type"], 9))

    # Build HTML email
    _TYPE_COLOR = {"critical": "#ef4444", "warning": "#f59e0b", "info": "#3b82f6"}
    _TYPE_LABEL = {"critical": "Critique", "warning": "Attention", "info": "Info"}
    rows = "".join(
        f"""<tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
            <span style="display:inline-block;padding:2px 10px;background:{_TYPE_COLOR.get(a['type'],'#64748b')}22;
              color:{_TYPE_COLOR.get(a['type'],'#64748b')};font-size:11px;font-weight:700;border-radius:12px;margin-right:8px;">
              {_TYPE_LABEL.get(a['type'],'Info')}
            </span>
            <strong style="color:#0f172a;font-size:14px;">{a['title']}</strong><br/>
            <span style="color:#64748b;font-size:13px;">{a['message']}</span>
          </td>
        </tr>"""
        for a in alerts[:10]
    )

    critical_count = sum(1 for a in alerts if a["type"] == "critical")
    warning_count = sum(1 for a in alerts if a["type"] == "warning")

    html = f"""<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
  <div style="background:linear-gradient(135deg,#0f172a,#1e3a2f);padding:28px 32px;">
    <span style="display:inline-block;padding:4px 14px;background:#22c55e22;color:#4ade80;font-size:12px;font-weight:700;border-radius:20px;margin-bottom:12px;">
      ESGFlow Alertes
    </span>
    <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;">Rapport d'alertes ESG</h1>
    <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;">{datetime.now().strftime('%d/%m/%Y')} — {len(alerts)} alerte{'s' if len(alerts) > 1 else ''}</p>
  </div>
  <div style="padding:24px 32px;">
    <table width="100%" cellpadding="4" cellspacing="4" style="margin-bottom:20px;">
      <tr>
        <td style="text-align:center;padding:16px;background:#fef2f2;border-radius:10px;width:50%;">
          <div style="font-size:28px;font-weight:800;color:#ef4444;">{critical_count}</div>
          <div style="font-size:11px;color:#64748b;font-weight:600;">CRITIQUES</div>
        </td>
        <td style="text-align:center;padding:16px;background:#fffbeb;border-radius:10px;width:50%;">
          <div style="font-size:28px;font-weight:800;color:#f59e0b;">{warning_count}</div>
          <div style="font-size:11px;color:#64748b;font-weight:600;">ATTENTION</div>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      {rows}
    </table>
    <div style="margin-top:24px;text-align:center;">
      <a href="https://greenconnect.cloud/app" style="display:inline-block;padding:12px 28px;background:#059669;color:#fff;font-weight:700;font-size:14px;border-radius:10px;text-decoration:none;">
        Voir le tableau de bord ESGFlow
      </a>
    </div>
  </div>
  <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
      Vous recevez ce rapport car vous avez activé les alertes email dans ESGFlow.
    </p>
  </div>
</div>
</body></html>"""

    sent = EmailService._send(user.email, f"Rapport d'alertes ESGFlow — {critical_count} critique(s)", html)
    return {"sent": sent, "alerts_count": len(alerts), "email": user.email}

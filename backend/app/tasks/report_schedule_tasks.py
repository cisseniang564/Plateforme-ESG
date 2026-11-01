"""
Exécution des rapports planifiés.

L'API enregistre les calendriers dans Redis (``reports:scheduled:<tenant>``). Cette tâche, lancée
toutes les heures par Celery beat, génère chaque rapport échu, l'archive dans l'historique
(version + empreinte SHA-256), crée un lien de partage temporaire et prévient les destinataires.
Les e-mails portent un lien, pas la pièce jointe : le fichier est régénéré à l'ouverture du lien.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from celery import shared_task
from celery.utils.log import get_task_logger

from app.services.report_schedule import is_due, mark_run

logger = get_task_logger(__name__)
SHARE_DAYS = 14


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _redis():
    import redis
    from app.config import settings
    url = str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0"
    return redis.from_url(url, decode_responses=True, socket_connect_timeout=2)


async def _generate_and_archive(tenant_id: UUID, schedule: dict) -> str:
    """Génère le rapport, l'enregistre dans l'historique et renvoie le jeton de partage."""
    from sqlalchemy import func, select

    from app.db.session import SystemSessionLocal
    from app.models.report_history import ReportHistory
    from app.services.report_service import ReportService

    from app.api.v1.endpoints.reports import _REPORT_TYPE_TO_FEATURE
    from app.dependencies import assert_feature_enabled

    year = datetime.now(timezone.utc).year
    report_type, fmt = schedule["report_type"], schedule.get("format", "pdf")
    async with SystemSessionLocal() as db:
        # Même contrôle de plan qu'à la génération manuelle : un plan échu ne génère plus de rapport payant.
        feature = _REPORT_TYPE_TO_FEATURE.get(report_type.lower())
        if feature:
            await assert_feature_enabled(db, tenant_id, feature)
        content = await ReportService(db).generate_report(
            tenant_id=tenant_id, report_type=report_type, organization_id=None,
            period="annual", year=year, format=fmt,
        )
        max_version = (await db.execute(
            select(func.max(ReportHistory.version)).where(
                ReportHistory.tenant_id == tenant_id,
                ReportHistory.report_type == report_type,
                ReportHistory.year == year,
            )
        )).scalar()
        token = secrets.token_urlsafe(24)
        db.add(ReportHistory(
            tenant_id=tenant_id, report_type=report_type, format=fmt, period="annual", year=year,
            organization_id=None, generated_by=None, file_size=len(content),
            content_hash=hashlib.sha256(content).hexdigest(), version=int(max_version or 0) + 1,
            params={"scheduled": True, "schedule_id": schedule.get("id"), "title": schedule.get("title")},
            share_token=token, share_expires_at=datetime.now(timezone.utc) + timedelta(days=SHARE_DAYS),
        ))
        await db.commit()
    return token


@shared_task(name="reports.dispatch_scheduled", soft_time_limit=900, time_limit=1000)
def dispatch_scheduled_reports() -> dict:
    """Génère et envoie les rapports planifiés échus (tous comptes). Un échec n'arrête pas les autres."""
    from app.config import settings
    from app.services.email_service import EmailService

    r = _redis()
    now = datetime.utcnow()
    summary = {"checked": 0, "sent": 0, "failed": 0}

    for key in r.scan_iter(match="reports:scheduled:*"):
        try:
            tenant_id = UUID(key.split(":")[-1])
            schedules = json.loads(r.get(key) or "[]")
        except Exception as exc:  # clé illisible : on passe à la suivante
            logger.warning("Calendrier illisible (%s): %s", key, exc)
            continue

        summary["checked"] += len(schedules)
        changed = False
        for idx, sch in enumerate(schedules):
            if not is_due(sch, now):
                continue
            try:
                token = _run_async(_generate_and_archive(tenant_id, sch))
                link = f"{settings.APP_URL.rstrip('/')}/api/v1/reports/shared/{token}"
                for to in sch.get("recipients") or []:
                    EmailService.send_scheduled_report(to, sch.get("title", "Rapport ESG"), link, SHARE_DAYS)
                schedules[idx] = mark_run(sch, now, ok=True)
                summary["sent"] += 1
            except Exception as exc:
                logger.error("Rapport planifié %s en échec: %s", sch.get("id"), exc)
                schedules[idx] = mark_run(sch, now, ok=False, detail=str(exc))
                summary["failed"] += 1
            changed = True

        if changed:
            r.setex(key, 365 * 24 * 3600, json.dumps(schedules))

    logger.info("Rapports planifiés: %s", summary)
    return summary

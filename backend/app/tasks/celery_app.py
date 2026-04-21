"""
Celery application — ESGFlow async task queue.

Broker + result backend : Redis (DB 1, séparé de la session FastAPI sur DB 0).
Queues :
  - default   : tâches générales
  - email     : envoi transactionnel (priorité haute)
  - reports   : génération de rapports (potentiellement lent)
  - scoring   : recalcul des scores ESG
"""
from __future__ import annotations

import logging
from celery import Celery
from celery.schedules import crontab

logger = logging.getLogger(__name__)


def _broker_url() -> str:
    """Build Redis broker URL from settings, fallback to env var."""
    try:
        from app.config import settings
        redis_pw = settings.REDIS_PASSWORD or ""
        redis_host = getattr(settings, "REDIS_HOST", "redis")
        redis_port = getattr(settings, "REDIS_PORT", 6379)
        auth = f":{redis_pw}@" if redis_pw else ""
        return f"redis://{auth}{redis_host}:{redis_port}/1"
    except Exception as e:
        logger.warning("Celery: could not read settings, using default broker URL (%s)", e)
        return "redis://redis:6379/1"


broker = _broker_url()

celery_app = Celery(
    "esgflow",
    broker=broker,
    backend=broker,
    include=[
        "app.tasks.email_tasks",
        "app.tasks.report_tasks",
        "app.tasks.scoring_tasks",
    ],
)

celery_app.conf.update(
    # Serialization
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Timezone
    timezone="UTC",
    enable_utc=True,

    # Reliability
    task_track_started=True,
    task_acks_late=True,           # re-queue on worker crash
    worker_prefetch_multiplier=1,  # fair dispatch — 1 task at a time per worker

    # Results TTL — 24 h
    result_expires=86400,

    # Routing
    task_default_queue="default",
    task_queues={
        "default": {"exchange": "default", "routing_key": "default"},
        "email":   {"exchange": "email",   "routing_key": "email"},
        "reports": {"exchange": "reports", "routing_key": "reports"},
        "scoring": {"exchange": "scoring", "routing_key": "scoring"},
    },
    task_routes={
        "app.tasks.email_tasks.*":   {"queue": "email"},
        "app.tasks.report_tasks.*":  {"queue": "reports"},
        "app.tasks.scoring_tasks.*": {"queue": "scoring"},
    },

    # Beat periodic tasks
    beat_schedule={
        # Recalculate ESG scores every night at 3 AM UTC
        "nightly-score-refresh": {
            "task": "scoring.refresh_all_scores",  # matches @shared_task(name=...)
            "schedule": crontab(hour=3, minute=0),
            "options": {"queue": "scoring"},
        },
        # Clean up expired task results every Sunday at 4 AM UTC
        "weekly-result-cleanup": {
            "task": "scoring.cleanup_stale_results",  # matches @shared_task(name=...)
            "schedule": crontab(hour=4, minute=0, day_of_week=0),
        },
    },
)

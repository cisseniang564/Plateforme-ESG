"""
Celery application — broker & result backend via Redis.
"""
from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "esgflow",
    broker=settings.REDIS_URL.replace("/0", "/1"),   # DB 1 for Celery broker
    backend=settings.REDIS_URL.replace("/0", "/2"),  # DB 2 for results
    include=["workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    result_expires=3600,
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# ── Beat schedule ─────────────────────────────────────────────────────────────
celery_app.conf.beat_schedule = {
    # Data retention — daily at 02:00 UTC
    "cleanup-old-esg-scores": {
        "task": "workers.tasks.cleanup_old_esg_scores",
        "schedule": crontab(hour=2, minute=0),
    },
    "cleanup-audit-logs": {
        "task": "workers.tasks.cleanup_audit_logs",
        "schedule": crontab(hour=2, minute=15),
    },
    "cleanup-soft-deleted-records": {
        "task": "workers.tasks.cleanup_soft_deleted_records",
        "schedule": crontab(hour=2, minute=30),
    },
    "cleanup-expired-tokens": {
        "task": "workers.tasks.cleanup_expired_verification_tokens",
        "schedule": crontab(hour=3, minute=0),
    },
    # Trial reminders — daily at 09:00 UTC
    "trial-ending-reminders": {
        "task": "workers.tasks.send_trial_ending_reminders",
        "schedule": crontab(hour=9, minute=0),
    },
    # API usage summary — monthly on the 1st at 08:00
    "monthly-api-usage-report": {
        "task": "workers.tasks.generate_monthly_api_usage_report",
        "schedule": crontab(hour=8, minute=0, day_of_month=1),
    },
}

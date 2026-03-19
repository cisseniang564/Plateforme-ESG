# ============================================================================
# Fichier: /home/claude/esg-saas-platform/workers/celery_app.py
# Description: Configuration de l'application Celery
# ============================================================================

"""
Celery application configuration for ESGFlow.
"""
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from celery import Celery

from app.config import settings

# Create Celery app
celery_app = Celery(
    "esgflow",
    broker=str(settings.CELERY_BROKER_URL or settings.REDIS_URL).replace("redis://", "redis://").replace("/0", "/1"),
    backend=str(settings.CELERY_RESULT_BACKEND or settings.REDIS_URL).replace("redis://", "redis://").replace("/0", "/1"),
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Auto-discover tasks
celery_app.autodiscover_tasks(["workers.tasks"])

# Make celery_app available as 'app' for Celery CLI
app = celery_app


@celery_app.task(bind=True)
def debug_task(self):
    """Debug task to test Celery is working."""
    print(f"Request: {self.request!r}")
    return "Celery is working!"


if __name__ == "__main__":
    celery_app.start()
# app/tasks — Celery async tasks for ESGFlow
from app.tasks.celery_app import celery_app  # noqa: F401

__all__ = ["celery_app"]

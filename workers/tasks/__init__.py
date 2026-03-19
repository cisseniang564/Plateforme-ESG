# ============================================================================
# Fichier: /home/claude/esg-saas-platform/workers/tasks/__init__.py
# Description: Module des tâches Celery
# ============================================================================

"""
Celery tasks for ESGFlow.
"""

from workers.tasks.example_tasks import (
    add,
    send_email_task,
    process_data_upload,
)

__all__ = [
    "add",
    "send_email_task",
    "process_data_upload",
]
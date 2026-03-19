# ============================================================================
# Fichier: /home/claude/esg-saas-platform/workers/config.py
# Description: Configuration Celery
# ============================================================================

"""
Celery configuration.
"""

# Task routing
task_routes = {
    "tasks.send_email": {"queue": "emails"},
    "tasks.process_data_upload": {"queue": "data_processing"},
    "tasks.calculate_score": {"queue": "scoring"},
}

# Task priorities
task_default_priority = 5

# Result backend
result_expires = 3600  # 1 hour

# Worker settings
worker_pool_restarts = True
worker_max_memory_per_child = 200000  # 200MB
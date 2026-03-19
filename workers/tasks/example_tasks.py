# ============================================================================
# Fichier: /home/claude/esg-saas-platform/workers/tasks/example_tasks.py
# Description: Tâches Celery d'exemple
# ============================================================================

"""
Example Celery tasks for testing and demonstration.
"""
import time
from typing import Dict

from workers.celery_app import celery_app


@celery_app.task(name="tasks.add")
def add(x: int, y: int) -> int:
    """
    Simple addition task for testing.
    
    Args:
        x: First number
        y: Second number
    
    Returns:
        Sum of x and y
    """
    return x + y


@celery_app.task(name="tasks.send_email")
def send_email_task(to: str, subject: str, body: str) -> Dict[str, str]:
    """
    Send email task (mock implementation).
    
    Args:
        to: Recipient email
        subject: Email subject
        body: Email body
    
    Returns:
        Status dictionary
    """
    # Simulate email sending delay
    time.sleep(2)
    
    print(f"📧 Sending email to {to}")
    print(f"   Subject: {subject}")
    print(f"   Body: {body[:50]}...")
    
    return {
        "status": "sent",
        "to": to,
        "subject": subject,
    }


@celery_app.task(name="tasks.process_data_upload", bind=True)
def process_data_upload(self, upload_id: str, tenant_id: str) -> Dict:
    """
    Process uploaded data file (placeholder).
    
    This would typically:
    1. Load file from S3
    2. Validate data
    3. Transform/normalize
    4. Store in database
    5. Trigger score calculation
    
    Args:
        self: Task instance (for updating progress)
        upload_id: Upload UUID
        tenant_id: Tenant UUID
    
    Returns:
        Processing result
    """
    print(f"🔄 Processing upload {upload_id} for tenant {tenant_id}")
    
    # Simulate processing steps
    steps = [
        "Loading file from storage",
        "Validating schema",
        "Checking data quality",
        "Normalizing values",
        "Storing in database",
    ]
    
    for i, step in enumerate(steps):
        print(f"   Step {i+1}/{len(steps)}: {step}")
        
        # Update task progress
        self.update_state(
            state="PROGRESS",
            meta={
                "current": i + 1,
                "total": len(steps),
                "status": step,
            }
        )
        
        # Simulate work
        time.sleep(1)
    
    return {
        "status": "completed",
        "upload_id": upload_id,
        "rows_processed": 1000,
        "errors": 0,
    }
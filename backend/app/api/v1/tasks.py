# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/app/api/v1/tasks.py
# Description: Endpoints de test pour les tâches Celery
# ============================================================================

"""
Task testing endpoints.
"""
from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/tasks", tags=["Tasks (Testing)"])


class TaskResponse(BaseModel):
    """Response for task submission."""
    
    task_id: str
    status: str
    message: str


class AddRequest(BaseModel):
    """Request for addition task."""
    
    x: int
    y: int


class EmailRequest(BaseModel):
    """Request for email task."""
    
    to: str
    subject: str
    body: str


@router.post("/test/add", response_model=TaskResponse)
def test_add_task(request: AddRequest):
    """
    Test simple addition task.
    
    Example:
        POST /api/v1/tasks/test/add
        {"x": 10, "y": 20}
    """
    # Import dynamically to avoid startup issues
    from workers.tasks import add
    
    result = add.delay(request.x, request.y)
    
    return TaskResponse(
        task_id=result.id,
        status="submitted",
        message=f"Task submitted to calculate {request.x} + {request.y}"
    )


@router.post("/test/email", response_model=TaskResponse)
def test_email_task(request: EmailRequest):
    """
    Test email sending task.
    
    Example:
        POST /api/v1/tasks/test/email
        {
            "to": "test@example.com",
            "subject": "Test",
            "body": "Hello from Celery"
        }
    """
    # Import dynamically to avoid startup issues
    from workers.tasks import send_email_task
    
    result = send_email_task.delay(
        to=request.to,
        subject=request.subject,
        body=request.body
    )
    
    return TaskResponse(
        task_id=result.id,
        status="submitted",
        message=f"Email task submitted to {request.to}"
    )


@router.post("/test/process", response_model=TaskResponse)
def test_process_task():
    """
    Test data processing task with progress tracking.
    
    Example:
        POST /api/v1/tasks/test/process
    """
    # Import dynamically to avoid startup issues
    from workers.tasks import process_data_upload
    
    result = process_data_upload.delay(
        upload_id=str(uuid4()),
        tenant_id=str(uuid4())
    )
    
    return TaskResponse(
        task_id=result.id,
        status="submitted",
        message="Data processing task submitted. Check Flower for progress."
    )


@router.get("/status/{task_id}")
def get_task_status(task_id: str):
    """
    Get status of a task.
    
    Example:
        GET /api/v1/tasks/status/{task_id}
    """
    from celery.result import AsyncResult
    
    result = AsyncResult(task_id)
    
    response = {
        "task_id": task_id,
        "status": result.status,
        "ready": result.ready(),
    }
    
    if result.ready():
        try:
            response["result"] = result.get(timeout=1)
        except Exception as e:
            response["error"] = str(e)
    elif result.state == 'PROGRESS':
        response["progress"] = result.info
    
    return response
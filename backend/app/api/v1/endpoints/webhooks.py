"""
Webhooks API endpoints.
"""
from uuid import UUID
from typing import List, Optional
import secrets

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, HttpUrl

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.models.webhook import Webhook, WebhookDelivery
from app.services.webhook_service import WebhookService

router = APIRouter()


class WebhookCreate(BaseModel):
    name: str
    url: HttpUrl
    events: List[str]


class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[HttpUrl] = None
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None


@router.get("/events")
async def list_available_events():
    """List all available webhook event types."""
    
    return {
        "events": [
            {
                "type": WebhookService.EVENT_DATA_UPLOADED,
                "description": "Triggered when new data is uploaded",
            },
            {
                "type": WebhookService.EVENT_SCORE_CALCULATED,
                "description": "Triggered when ESG score is calculated",
            },
            {
                "type": WebhookService.EVENT_INDICATOR_CREATED,
                "description": "Triggered when a new indicator is created",
            },
            {
                "type": WebhookService.EVENT_INDICATOR_UPDATED,
                "description": "Triggered when an indicator is updated",
            },
            {
                "type": WebhookService.EVENT_USER_CREATED,
                "description": "Triggered when a new user is added",
            },
            {
                "type": WebhookService.EVENT_THRESHOLD_EXCEEDED,
                "description": "Triggered when a metric exceeds threshold",
            },
        ]
    }


@router.get("/")
async def list_webhooks(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List all webhooks for current tenant."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    query = select(Webhook).where(Webhook.tenant_id == user.tenant_id)
    
    count_query = select(func.count()).select_from(Webhook).where(
        Webhook.tenant_id == user.tenant_id
    )
    total = await db.scalar(count_query) or 0
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(Webhook.created_at.desc())
    
    result = await db.execute(query)
    webhooks = result.scalars().all()
    
    return {
        "items": [{
            "id": str(w.id),
            "name": w.name,
            "url": str(w.url),
            "events": w.events,
            "is_active": w.is_active,
            "total_calls": w.total_calls,
            "success_calls": w.success_calls,
            "success_rate": round((w.success_calls / w.total_calls * 100) if w.total_calls > 0 else 0, 2),
            "last_called_at": w.last_called_at.isoformat() if w.last_called_at else None,
            "last_error": w.last_error,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        } for w in webhooks],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/")
async def create_webhook(
    data: WebhookCreate,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new webhook."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate secret
    secret = secrets.token_urlsafe(32)
    
    webhook = Webhook(
        tenant_id=user.tenant_id,
        name=data.name,
        url=str(data.url),
        secret=secret,
        events=data.events,
        is_active=True,
    )
    
    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)
    
    return {
        "id": str(webhook.id),
        "name": webhook.name,
        "url": webhook.url,
        "secret": secret,  # Show secret only once
        "events": webhook.events,
        "message": "Webhook created successfully. Save the secret - it won't be shown again!"
    }


@router.get("/{webhook_id}/deliveries")
async def get_webhook_deliveries(
    webhook_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get delivery history for a webhook."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify webhook belongs to user's tenant
    webhook_query = select(Webhook).where(
        Webhook.id == webhook_id,
        Webhook.tenant_id == user.tenant_id
    )
    webhook_result = await db.execute(webhook_query)
    webhook = webhook_result.scalar_one_or_none()
    
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    query = select(WebhookDelivery).where(WebhookDelivery.webhook_id == webhook_id)
    
    count_query = select(func.count()).select_from(WebhookDelivery).where(
        WebhookDelivery.webhook_id == webhook_id
    )
    total = await db.scalar(count_query) or 0
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(WebhookDelivery.created_at.desc())
    
    result = await db.execute(query)
    deliveries = result.scalars().all()
    
    return {
        "items": [{
            "id": str(d.id),
            "event_type": d.event_type,
            "status_code": d.status_code,
            "duration_ms": d.duration_ms,
            "error": d.error,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        } for d in deliveries],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


class WebhookUpdateRequest(BaseModel):
    is_active: Optional[bool] = None
    url: Optional[str] = None
    events: Optional[List[str]] = None


@router.patch("/{webhook_id}")
async def update_webhook(
    webhook_id: UUID,
    data: WebhookUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update a webhook (toggle active state, change URL or events)."""
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    webhook_query = select(Webhook).where(
        Webhook.id == webhook_id,
        Webhook.tenant_id == user.tenant_id
    )
    webhook_result = await db.execute(webhook_query)
    webhook = webhook_result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    if data.is_active is not None:
        webhook.is_active = data.is_active
    if data.url is not None:
        webhook.url = data.url
    if data.events is not None:
        webhook.events = data.events

    await db.commit()
    await db.refresh(webhook)
    return {"id": str(webhook.id), "is_active": webhook.is_active, "url": webhook.url}


@router.delete("/{webhook_id}")
async def delete_webhook(
    webhook_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a webhook."""
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    webhook_query = select(Webhook).where(
        Webhook.id == webhook_id,
        Webhook.tenant_id == user.tenant_id
    )
    webhook_result = await db.execute(webhook_query)
    webhook = webhook_result.scalar_one_or_none()
    
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    await db.delete(webhook)
    await db.commit()
    
    return {"message": "Webhook deleted successfully"}

"""
Webhook service - Send event notifications.
"""
import hmac
import hashlib
import time
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.webhook import Webhook, WebhookDelivery


class WebhookService:
    """Service for sending webhook notifications."""
    
    # Event types
    EVENT_DATA_UPLOADED = "data.uploaded"
    EVENT_SCORE_CALCULATED = "score.calculated"
    EVENT_INDICATOR_CREATED = "indicator.created"
    EVENT_INDICATOR_UPDATED = "indicator.updated"
    EVENT_USER_CREATED = "user.created"
    EVENT_THRESHOLD_EXCEEDED = "threshold.exceeded"
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def send_event(
        self,
        tenant_id: UUID,
        event_type: str,
        payload: Dict[str, Any],
    ) -> None:
        """Send webhook event to all subscribed webhooks."""
        
        # Get active webhooks for this tenant and event type
        query = select(Webhook).where(
            Webhook.tenant_id == tenant_id,
            Webhook.is_active == True,
        )
        
        result = await self.db.execute(query)
        webhooks = list(result.scalars().all())
        
        # Filter webhooks that subscribe to this event
        webhooks = [w for w in webhooks if event_type in w.events or '*' in w.events]
        
        # Send to each webhook
        for webhook in webhooks:
            await self._send_to_webhook(webhook, event_type, payload)
    
    async def _send_to_webhook(
        self,
        webhook: Webhook,
        event_type: str,
        payload: Dict[str, Any],
    ) -> None:
        """Send event to a specific webhook."""
        
        start_time = time.time()
        
        # Prepare payload
        full_payload = {
            "event": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": payload,
        }
        
        # Generate signature
        signature = self._generate_signature(webhook.secret, full_payload)
        
        # Send request
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Event-Type": event_type,
            "User-Agent": "ESGFlow-Webhook/1.0",
        }
        
        delivery = WebhookDelivery(
            webhook_id=webhook.id,
            event_type=event_type,
            payload=full_payload,
        )
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    webhook.url,
                    json=full_payload,
                    headers=headers,
                )
                
                duration_ms = int((time.time() - start_time) * 1000)
                
                delivery.status_code = response.status_code
                delivery.response = response.text[:1000]  # Limit response size
                delivery.duration_ms = duration_ms
                
                # Update webhook stats
                webhook.total_calls += 1
                webhook.last_called_at = datetime.utcnow()
                
                if 200 <= response.status_code < 300:
                    webhook.success_calls += 1
                else:
                    webhook.last_error = f"HTTP {response.status_code}: {response.text[:200]}"
        
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            delivery.duration_ms = duration_ms
            delivery.error = str(e)[:1000]
            webhook.total_calls += 1
            webhook.last_called_at = datetime.utcnow()
            webhook.last_error = str(e)[:200]
        
        # Save delivery log
        self.db.add(delivery)
        await self.db.commit()
    
    def _generate_signature(self, secret: str, payload: Dict[str, Any]) -> str:
        """Generate HMAC signature for payload verification."""
        import json
        
        payload_str = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            secret.encode(),
            payload_str.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return f"sha256={signature}"

"""
Webhook model - Event notifications.
"""
from typing import TYPE_CHECKING, Optional, List
from uuid import UUID
from datetime import datetime

from sqlalchemy import String, Boolean, JSON, Text, Integer
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.tenant import Tenant


class Webhook(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """
    Webhook configuration for event notifications.
    """
    
    __tablename__ = "webhooks"
    
    # Configuration
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Webhook name",
    )
    
    url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="Target URL for webhook calls",
    )
    
    secret: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Secret for HMAC signature verification",
    )
    
    # Events to subscribe to
    events: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="List of event types to subscribe to",
    )
    
    # Status
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether webhook is active",
    )
    
    # Statistics
    total_calls: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Total number of webhook calls",
    )
    
    success_calls: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of successful calls",
    )
    
    last_called_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
        comment="Last time webhook was called",
    )
    
    last_error: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Last error message",
    )
    
    # Relationships
    tenant: Mapped["Tenant"] = relationship("Tenant")
    
    def __repr__(self) -> str:
        return f"<Webhook(name={self.name}, url={self.url})>"


class WebhookDelivery(Base, UUIDMixin, TimestampMixin):
    """
    Webhook delivery log.
    """
    
    __tablename__ = "webhook_deliveries"
    
    webhook_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    
    event_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    
    payload: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )
    
    status_code: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    
    response: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    error: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    
    duration_ms: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        comment="Request duration in milliseconds",
    )
    
    def __repr__(self) -> str:
        return f"<WebhookDelivery(event={self.event_type}, status={self.status_code})>"

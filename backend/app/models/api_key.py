"""API Key model for public API authentication."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, UUIDMixin, TimestampMixin


class ApiKey(Base, UUIDMixin, TenantMixin, TimestampMixin):
    """API key for programmatic access to the ESGFlow API."""

    __tablename__ = "api_keys"

    name: Mapped[str] = mapped_column(String(100), nullable=False, comment="Human-readable key name")
    key_prefix: Mapped[str] = mapped_column(String(16), nullable=False, index=True, unique=True, comment="Prefix shown in UI (e.g. esgsk_prod_xxxx)")
    key_hash: Mapped[str] = mapped_column(String(255), nullable=False, comment="SHA-256 hash of the full API key")
    created_by_user_id: Mapped[UUID] = mapped_column(nullable=False, comment="User who created this key")
    last_used_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<ApiKey(name={self.name}, prefix={self.key_prefix})>"

"""Journal des synchronisations de connecteurs : une ligne par tentative (réussie, en erreur ou simulée)."""
from typing import Optional

from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TenantMixin, TimestampMixin, UUIDMixin


class ConnectorSyncLog(Base, UUIDMixin, TenantMixin, TimestampMixin):
    __tablename__ = "connector_sync_logs"

    connector_id: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    # ok | error | no_data | not_configured | simulated
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    records: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

"""Écriture et lecture du journal des synchronisations (table connector_sync_logs)."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.connector_sync_log import ConnectorSyncLog

MAX_MESSAGE = 500


async def log_sync(db: AsyncSession, tenant_id: UUID, connector_id: str, status: str, records: int = 0,
                   message: Optional[str] = None, duration_ms: Optional[int] = None) -> None:
    """Ajoute une ligne au journal. Ne doit jamais faire échouer la synchronisation elle-même."""
    try:
        db.add(ConnectorSyncLog(
            tenant_id=tenant_id, connector_id=connector_id[:60], status=status, records=max(0, int(records)),
            message=(message or "")[:MAX_MESSAGE] or None, duration_ms=duration_ms,
        ))
        await db.flush()
    except Exception:  # noqa: BLE001 — le journal est secondaire
        pass


def serialize(row: Any) -> Dict[str, Any]:
    return {
        "id": str(row.id), "connector_id": row.connector_id, "status": row.status, "records": row.records,
        "message": row.message, "duration_ms": row.duration_ms, "created_at": row.created_at.isoformat() if row.created_at else None,
    }


async def recent(db: AsyncSession, tenant_id: UUID, days: int = 30, limit: int = 100) -> List[Dict[str, Any]]:
    since = datetime.now(timezone.utc) - timedelta(days=max(1, min(days, 365)))
    rows = (await db.execute(
        select(ConnectorSyncLog).where(ConnectorSyncLog.tenant_id == tenant_id, ConnectorSyncLog.created_at >= since)
        .order_by(ConnectorSyncLog.created_at.desc()).limit(max(1, min(limit, 500)))
    )).scalars().all()
    return [serialize(r) for r in rows]

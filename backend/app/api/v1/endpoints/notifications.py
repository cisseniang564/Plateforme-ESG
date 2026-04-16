"""
Notifications endpoint — returns recent platform events as in-app notifications.
Backed by the existing audit_log table; no new schema migration required.
"""
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id, get_current_tenant_id
from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Notification preferences (Redis-backed) ───────────────────────────────────

def _get_redis():
    try:
        import redis as _redis
        redis_url = str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0"
        return _redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=2)
    except Exception as e:
        logger.warning("Notifications preferences: Redis unavailable — %s", e)
        return None


class AlertSetting(BaseModel):
    id: str
    label: str
    description: str
    enabled: bool
    channel: str  # "email" | "inapp" | "both"

class NotificationPreferences(BaseModel):
    alerts: List[AlertSetting]
    email_enabled: bool = True
    webhook_url: str = ""

# ── helpers ───────────────────────────────────────────────────────────────────

_ACTION_TO_TYPE = {
    "create": "success",
    "update": "info",
    "delete": "warning",
    "validate": "success",
    "reject": "error",
    "error": "error",
    "login": "info",
}

_ENTITY_LABELS = {
    "data_entries": "Saisie de données",
    "esg_scores": "Score ESG",
    "reports": "Rapport",
    "materiality_issues": "Matérialité",
    "users": "Utilisateur",
    "organizations": "Organisation",
    "connectors": "Connecteur",
    "indicator_data": "Indicateur",
    "webhooks": "Webhook",
}

_ACTION_VERBS = {
    "create": "créé",
    "update": "mis à jour",
    "delete": "supprimé",
    "validate": "validé",
    "reject": "rejeté",
    "error": "erreur détectée",
    "login": "connexion",
}

_ENTITY_LINKS = {
    "data_entries": "/app/data-entry",
    "esg_scores": "/app/scores-dashboard",
    "reports": "/app/reports",
    "materiality_issues": "/app/materiality",
    "users": "/app/settings/users",
    "organizations": "/app/organizations",
    "connectors": "/app/data/connectors",
    "indicator_data": "/app/indicators",
    "webhooks": "/app/settings/webhooks",
}


def _format(log: AuditLog) -> dict:
    entity_label = _ENTITY_LABELS.get(log.entity_type, log.entity_type.replace("_", " ").title())
    action_verb = _ACTION_VERBS.get(log.action, log.action)
    notif_type = _ACTION_TO_TYPE.get(log.action, "info")
    link = _ENTITY_LINKS.get(log.entity_type, "/app")

    # Build title / body
    title = f"{entity_label} {action_verb}"
    body = log.change_reason or (
        f"Par {log.user_email}" if log.user_email else "Action système"
    )
    # Pull a richer description from new_values if available
    if log.new_values and isinstance(log.new_values, dict):
        name = log.new_values.get("name") or log.new_values.get("title") or log.new_values.get("email")
        if name:
            body = f"« {name} » — {body}"

    # Relative time
    now = datetime.now(timezone.utc)
    created = log.created_at.replace(tzinfo=timezone.utc) if log.created_at.tzinfo is None else log.created_at
    diff = now - created
    if diff.total_seconds() < 60:
        time_str = "à l'instant"
    elif diff.total_seconds() < 3600:
        time_str = f"il y a {int(diff.total_seconds() // 60)} min"
    elif diff.total_seconds() < 86400:
        time_str = f"il y a {int(diff.total_seconds() // 3600)}h"
    else:
        time_str = f"il y a {diff.days}j"

    return {
        "id": str(log.id),
        "type": notif_type,
        "title": title,
        "body": body,
        "time": time_str,
        "read": bool(log.entry_metadata and log.entry_metadata.get("read")),
        "link": link,
        "created_at": log.created_at.isoformat(),
    }


# ── routes ────────────────────────────────────────────────────────────────────

@router.get("", summary="List recent notifications")
async def list_notifications(
    limit: int = Query(default=20, le=50),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return the 20 most recent audit events as notifications for this tenant."""
    since = datetime.now(timezone.utc) - timedelta(days=30)
    stmt = (
        select(AuditLog)
        .where(AuditLog.tenant_id == tenant_id, AuditLog.created_at >= since)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    logs = result.scalars().all()
    items = [_format(log) for log in logs]
    unread = sum(1 for n in items if not n["read"])
    return {"items": items, "unread_count": unread, "total": len(items)}


@router.post("/read-all", summary="Mark all notifications as read")
async def mark_all_read(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark all audit log entries as read for this tenant (stores flag in entry_metadata)."""
    since = datetime.now(timezone.utc) - timedelta(days=30)
    stmt = (
        select(AuditLog)
        .where(AuditLog.tenant_id == tenant_id, AuditLog.created_at >= since)
    )
    result = await db.execute(stmt)
    logs = result.scalars().all()
    for log in logs:
        meta = dict(log.entry_metadata or {})
        meta["read"] = True
        log.entry_metadata = meta
    await db.commit()
    return {"message": "Toutes les notifications marquées comme lues."}


@router.post("/{notification_id}/read", summary="Mark single notification as read")
async def mark_one_read(
    notification_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> dict:
    log = await db.get(AuditLog, notification_id)
    if log and log.tenant_id == tenant_id:
        meta = dict(log.entry_metadata or {})
        meta["read"] = True
        log.entry_metadata = meta
        await db.commit()
    return {"message": "Notification marquée comme lue."}


# ─── Préférences d'alertes ────────────────────────────────────────────────────

_DEFAULT_ALERTS = [
    {"id": "score_change",    "label": "Variation de score ESG",       "description": "Alerte quand un score change de ±5 points",            "enabled": True,  "channel": "both"},
    {"id": "data_missing",    "label": "Données manquantes",            "description": "Rappel quand des indicateurs sont incomplets",          "enabled": True,  "channel": "inapp"},
    {"id": "report_ready",    "label": "Rapport généré",                "description": "Notification quand un rapport est prêt",               "enabled": True,  "channel": "email"},
    {"id": "deadline_risk",   "label": "Échéance CSRD",                 "description": "Alerte 30j avant une échéance réglementaire",          "enabled": True,  "channel": "both"},
    {"id": "connector_error", "label": "Erreur de connecteur",          "description": "Notification en cas d'échec de synchronisation",       "enabled": True,  "channel": "both"},
    {"id": "user_added",      "label": "Nouvel utilisateur",            "description": "Alerte lors de l'ajout d'un collaborateur",            "enabled": False, "channel": "email"},
]


@router.get("/preferences", summary="Get notification preferences")
async def get_preferences(
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> dict:
    r = _get_redis()
    if r:
        try:
            raw = r.get(f"notif:prefs:{tenant_id}")
            if raw:
                return json.loads(raw)
        except Exception:
            pass
    return {"alerts": _DEFAULT_ALERTS, "email_enabled": True, "webhook_url": ""}


@router.put("/preferences", summary="Save notification preferences")
async def save_preferences(
    payload: NotificationPreferences,
    tenant_id: UUID = Depends(get_current_tenant_id),
) -> dict:
    r = _get_redis()
    if r:
        try:
            r.setex(
                f"notif:prefs:{tenant_id}",
                365 * 24 * 3600,
                payload.model_dump_json(),
            )
        except Exception as e:
            logger.warning("Could not save notification preferences: %s", e)
    return {"message": "Préférences sauvegardées.", **payload.model_dump()}

"""
Notification Service — create proactive notifications + serve the bell.

Two responsibilities:

1. **Creation API** (used by Celery scans, business workflows, etc.) — create
   one notification with idempotency via ``dedupe_key`` so we don't spam.

2. **Read API** (used by the /notifications endpoint) — list notifications for
   a user, merge with the audit-log-derived activity feed, mark read/dismissed.

Scanners are wired in ``app.tasks.notification_tasks`` and produce:
  * Deadline notifications (CSRD / BEGES / CSDDD approaching)
  * Missing required ESRS datapoints
  * Validation pending (data entries awaiting approval)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationPriority, NotificationType
from app.models.tenant import Tenant

logger = logging.getLogger(__name__)


class NotificationService:
    """CRUD + business creation for in-app notifications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Create (idempotent via dedupe_key) ─────────────────────────────────
    async def create(
        self,
        *,
        tenant_id: UUID,
        type: str,
        title: str,
        body: Optional[str] = None,
        link: Optional[str] = None,
        priority: str = "medium",
        user_id: Optional[UUID] = None,
        dedupe_key: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[Notification]:
        """Create a notification, or return existing one if dedupe_key matches.

        Args:
            tenant_id: Owning tenant.
            type: One of NotificationType values.
            title: Short headline (max 255 chars).
            body: Optional longer description.
            link: Optional in-app link (e.g. ``/app/csrd-progress``).
            priority: low/medium/high/urgent.
            user_id: If None, the notification targets all tenant admins.
            dedupe_key: If provided, an existing notification with the same
                ``(tenant_id, dedupe_key)`` will be returned instead of
                creating a new one.
            expires_at: Optional auto-hide date.
            metadata: Structured payload.

        Returns:
            The persisted (or existing) Notification, or None on error.
        """
        if dedupe_key:
            existing = await self.db.execute(
                select(Notification).where(
                    Notification.tenant_id == tenant_id,
                    Notification.dedupe_key == dedupe_key,
                ).limit(1)
            )
            existing_row = existing.scalar_one_or_none()
            if existing_row is not None:
                return existing_row

        try:
            notif = Notification(
                tenant_id=tenant_id,
                user_id=user_id,
                type=type,
                title=title[:255],
                body=body,
                link=link,
                priority=priority,
                dedupe_key=dedupe_key,
                expires_at=expires_at,
                metadata_json=metadata or {},
            )
            self.db.add(notif)
            await self.db.commit()
            await self.db.refresh(notif)
            return notif
        except Exception as exc:
            logger.error("Failed to create notification: %s", exc, exc_info=True)
            try:
                await self.db.rollback()
            except Exception:
                pass
            return None

    # ── Read ───────────────────────────────────────────────────────────────
    async def list_for_user(
        self,
        tenant_id: UUID,
        user_id: UUID,
        *,
        limit: int = 50,
        include_read: bool = True,
        include_dismissed: bool = False,
    ) -> List[Notification]:
        """Return notifications for *user* in *tenant*. Most recent first."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(Notification)
            .where(Notification.tenant_id == tenant_id)
            .where(
                # Targeted at this user OR broadcast to all tenant users.
                (Notification.user_id == user_id) | (Notification.user_id.is_(None))
            )
        )
        if not include_read:
            stmt = stmt.where(Notification.read_at.is_(None))
        if not include_dismissed:
            stmt = stmt.where(Notification.dismissed_at.is_(None))
        # Hide expired unless we want everything.
        stmt = stmt.where(
            (Notification.expires_at.is_(None)) | (Notification.expires_at > now)
        )
        stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def unread_count(self, tenant_id: UUID, user_id: UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(Notification)
            .where(Notification.tenant_id == tenant_id)
            .where(
                (Notification.user_id == user_id) | (Notification.user_id.is_(None))
            )
            .where(Notification.read_at.is_(None))
            .where(Notification.dismissed_at.is_(None))
        )
        result = await self.db.execute(stmt)
        return int(result.scalar() or 0)

    # ── Mutations ──────────────────────────────────────────────────────────
    async def mark_read(self, tenant_id: UUID, user_id: UUID, notif_id: UUID) -> bool:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            update(Notification)
            .where(Notification.id == notif_id)
            .where(Notification.tenant_id == tenant_id)
            .where(
                (Notification.user_id == user_id) | (Notification.user_id.is_(None))
            )
            .values(read_at=now)
        )
        await self.db.commit()
        return result.rowcount > 0

    async def mark_all_read(self, tenant_id: UUID, user_id: UUID) -> int:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            update(Notification)
            .where(Notification.tenant_id == tenant_id)
            .where(
                (Notification.user_id == user_id) | (Notification.user_id.is_(None))
            )
            .where(Notification.read_at.is_(None))
            .values(read_at=now)
        )
        await self.db.commit()
        return result.rowcount or 0

    async def dismiss(self, tenant_id: UUID, user_id: UUID, notif_id: UUID) -> bool:
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            update(Notification)
            .where(Notification.id == notif_id)
            .where(Notification.tenant_id == tenant_id)
            .where(
                (Notification.user_id == user_id) | (Notification.user_id.is_(None))
            )
            .values(dismissed_at=now)
        )
        await self.db.commit()
        return result.rowcount > 0


# ─── Proactive generators ───────────────────────────────────────────────────


async def generate_deadline_notifications(db: AsyncSession, tenant_id: UUID) -> int:
    """
    Scan the tenant's regulations + CSRD wave and create deadline notifications
    when a publication deadline is < 90 days away.

    Idempotent via dedupe_key = "deadline:{regulation}:{deadline_iso}".
    """
    from app.services.csrd_progress_service import _deadline_for_wave

    service = NotificationService(db)
    tenant = await db.get(Tenant, tenant_id)
    if tenant is None:
        return 0

    settings = tenant.settings or {}
    regulations = settings.get("onboarding", {}).get("regulations", {})
    created = 0
    now = datetime.now(timezone.utc).date()

    # CSRD
    csrd = regulations.get("csrd") or {}
    deadline = _deadline_for_wave(csrd.get("wave"))
    if deadline:
        days_left = (deadline - now).days
        if 0 <= days_left <= 90:
            priority = (
                "urgent" if days_left <= 30
                else "high" if days_left <= 60
                else "medium"
            )
            n = await service.create(
                tenant_id=tenant_id,
                type=NotificationType.DEADLINE.value,
                priority=priority,
                title=f"CSRD : publication dans {days_left} jours",
                body=f"Échéance de publication CSRD vague {csrd.get('wave')} : {deadline.isoformat()}",
                link="/app/csrd-progress",
                dedupe_key=f"deadline:csrd:{deadline.isoformat()}",
                expires_at=datetime.combine(deadline, datetime.min.time(), tzinfo=timezone.utc),
                metadata={"days_left": days_left, "regulation": "csrd", "wave": csrd.get("wave")},
            )
            if n is not None:
                created += 1

    # BEGES — annual deadline = 31/12 each year for >500 employees
    if "beges" in regulations:
        year = now.year
        beges_deadline = datetime(year, 12, 31).date()
        days_left = (beges_deadline - now).days
        if 0 <= days_left <= 90:
            priority = "urgent" if days_left <= 30 else "high" if days_left <= 60 else "medium"
            n = await service.create(
                tenant_id=tenant_id,
                type=NotificationType.DEADLINE.value,
                priority=priority,
                title=f"BEGES : soumission dans {days_left} jours",
                body=f"Bilan GES réglementaire à soumettre à l'ADEME avant le {beges_deadline.isoformat()}",
                link="/app/carbon",
                dedupe_key=f"deadline:beges:{beges_deadline.isoformat()}",
                expires_at=datetime.combine(beges_deadline, datetime.min.time(), tzinfo=timezone.utc),
                metadata={"days_left": days_left, "regulation": "beges"},
            )
            if n is not None:
                created += 1

    return created


async def generate_missing_data_notifications(db: AsyncSession, tenant_id: UUID) -> int:
    """
    Create one notification when the tenant has unfilled REQUIRED ESRS
    datapoints. Single rolling notification per tenant (refreshed weekly).
    """
    from app.services.csrd_progress_service import CSRDProgressService

    service = NotificationService(db)
    progress_svc = CSRDProgressService(db, tenant_id)
    report = await progress_svc.build_dashboard()

    missing_required = report["required_total"] - report["required_covered"]
    if missing_required <= 0:
        return 0

    # Refresh weekly: include the ISO week in the dedupe key
    iso_year, iso_week, _ = datetime.now(timezone.utc).isocalendar()
    n = await service.create(
        tenant_id=tenant_id,
        type=NotificationType.MISSING_DATA.value,
        priority="medium",
        title=f"{missing_required} datapoints CSRD obligatoires manquants",
        body=(
            f"Votre rapport CSRD est complété à {report['required_completion_pct']}%. "
            f"Voir le détail des datapoints à remplir."
        ),
        link="/app/csrd-progress",
        dedupe_key=f"missing_data:csrd:{iso_year}-W{iso_week:02d}",
        metadata={
            "missing_required": missing_required,
            "required_completion_pct": report["required_completion_pct"],
        },
    )
    return 1 if n is not None else 0

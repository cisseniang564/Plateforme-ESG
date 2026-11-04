"""Vue réservée à l'exploitant de la plateforme : qui s'inscrit, qui se connecte.

Accès : uniquement les emails listés dans PLATFORM_ADMIN_EMAILS. Aucune donnée métier n'est
exposée (jamais le contenu des saisies) : identité du compte, société, dates et volumes.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select

from app.config import settings
from app.core.permissions import get_current_user
from app.db.session import SystemSessionLocal
from app.models.data_entry import DataEntry
from app.models.tenant import Tenant
from app.models.user import User

router = APIRouter()


def _allowed_emails() -> set[str]:
    return {e.strip().lower() for e in (settings.PLATFORM_ADMIN_EMAILS or "").split(",") if e.strip()}


async def require_platform_admin(current_user: User = Depends(get_current_user)) -> User:
    if (current_user.email or "").lower() not in _allowed_emails():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé à l'exploitant de la plateforme")
    return current_user


@router.get("/platform/me")
async def platform_me(current_user: User = Depends(get_current_user)) -> dict:
    """Indique si l'utilisateur courant a accès à la vue exploitant (sans erreur 403)."""
    return {"is_platform_admin": (current_user.email or "").lower() in _allowed_emails()}


@router.get("/platform/signups")
async def platform_signups(limit: int = 200, _admin: User = Depends(require_platform_admin)) -> dict:
    now = datetime.now(timezone.utc)
    limit = max(1, min(limit, 500))
    async with SystemSessionLocal() as db:
        entries = (
            select(DataEntry.tenant_id.label("tid"), func.count(DataEntry.id).label("n"))
            .group_by(DataEntry.tenant_id).subquery()
        )
        rows = (await db.execute(
            select(User, Tenant, func.coalesce(entries.c.n, 0))
            .join(Tenant, User.tenant_id == Tenant.id)
            .outerjoin(entries, entries.c.tid == Tenant.id)
            .order_by(User.created_at.desc())
            .limit(limit)
        )).all()
        total_users = (await db.execute(select(func.count(User.id)))).scalar_one()
        total_tenants = (await db.execute(select(func.count(Tenant.id)))).scalar_one()
        new_7d = (await db.execute(select(func.count(User.id)).where(User.created_at >= now - timedelta(days=7)))).scalar_one()
        new_30d = (await db.execute(select(func.count(User.id)).where(User.created_at >= now - timedelta(days=30)))).scalar_one()
        active_7d = (await db.execute(select(func.count(User.id)).where(User.last_login_at >= now - timedelta(days=7)))).scalar_one()
        never = (await db.execute(select(func.count(User.id)).where(User.last_login_at.is_(None)))).scalar_one()

    def iso(d): return d.isoformat() if d else None
    return {
        "summary": {
            "total_users": total_users, "total_tenants": total_tenants,
            "new_7d": new_7d, "new_30d": new_30d, "active_7d": active_7d, "never_logged_in": never,
        },
        "items": [
            {
                "user_id": str(u.id), "email": u.email,
                "full_name": f"{u.first_name or ''} {u.last_name or ''}".strip(),
                "company": t.name, "plan_tier": t.plan_tier,
                "created_at": iso(u.created_at), "last_login_at": iso(u.last_login_at),
                "email_verified": u.email_verified_at is not None,
                "trial_ends_at": iso(t.trial_ends_at), "entries_count": int(n or 0),
            }
            for u, t, n in rows
        ],
    }

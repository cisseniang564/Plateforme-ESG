"""Admin endpoints to manage users — scoped to the caller's tenant."""
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import Roles, get_current_user, require_role
from app.db.session import get_db
from app.models.tenant import Tenant
from app.models.user import User

router = APIRouter()


@router.get("/registrations/recent")
async def get_recent_registrations(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_role(Roles.TENANT_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Inscriptions récentes — limité au tenant de l'administrateur courant."""

    query = (
        select(User, Tenant)
        .join(Tenant, User.tenant_id == Tenant.id)
        .where(User.tenant_id == current_user.tenant_id)  # ← tenant scope
        .order_by(User.created_at.desc())
        .limit(max(1, min(limit, 100)))  # cap at 100
    )

    result = await db.execute(query)
    rows = result.all()

    registrations = [
        {
            "user_id": str(user.id),
            "email": user.email,
            "full_name": f"{user.first_name} {user.last_name}",
            "company": tenant.name,
            "tenant_id": str(tenant.id),
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "email_verified": user.email_verified_at is not None,
            "is_active": user.is_active,
            "subscription_status": tenant.subscription_status,
        }
        for user, tenant in rows
    ]

    return {"total": len(registrations), "registrations": registrations}


@router.get("/stats")
async def get_registration_stats(
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_role(Roles.TENANT_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Statistiques des inscriptions — limité au tenant de l'administrateur courant."""
    tid = current_user.tenant_id

    total_users = await db.scalar(
        select(func.count(User.id)).where(User.tenant_id == tid)
    )
    active_users = await db.scalar(
        select(func.count(User.id)).where(
            User.tenant_id == tid, User.is_active == True
        )
    )
    verified_users = await db.scalar(
        select(func.count(User.id)).where(
            User.tenant_id == tid, User.email_verified_at.isnot(None)
        )
    )
    today = datetime.utcnow().date()
    today_users = await db.scalar(
        select(func.count(User.id)).where(
            User.tenant_id == tid,
            func.date(User.created_at) == today,
        )
    )

    return {
        "tenant_id": str(tid),
        "total_users": total_users or 0,
        "active_users": active_users or 0,
        "verified_emails": verified_users or 0,
        "registrations_today": today_users or 0,
    }

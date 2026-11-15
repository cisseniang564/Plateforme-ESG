"""Règle unique pour l'auto-validation (une personne valide sa propre saisie).

Autorisée si le compte a activé « validation par un seul utilisateur », ou s'il n'y a
aucun autre utilisateur actif (sinon la saisie ne pourrait jamais être validée).
Chaque auto-validation reste signalée dans la piste d'audit.
"""
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tenant import Tenant
from app.models.user import User


async def setting_enabled(db: AsyncSession, tenant_id) -> bool:
    """Paramètre du compte (désactivé par défaut)."""
    tenant = await db.get(Tenant, tenant_id)
    settings = (tenant.settings or {}) if tenant else {}
    return bool((settings.get("validation") or {}).get("allow_self_approval", False))


async def has_other_active_user(db: AsyncSession, tenant_id, user_id) -> bool:
    count = (await db.execute(
        select(func.count(User.id)).where(
            User.tenant_id == tenant_id,
            User.id != user_id,
            User.is_active.is_(True),
        )
    )).scalar()
    return (count or 0) > 0


async def can_self_approve(db: AsyncSession, tenant_id, user_id) -> bool:
    if await setting_enabled(db, tenant_id):
        return True
    return not await has_other_active_user(db, tenant_id, user_id)

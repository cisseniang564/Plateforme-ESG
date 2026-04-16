"""
Common dependencies for FastAPI endpoints — auth, RBAC, tenant isolation.
"""
from datetime import datetime, timezone
from typing import AsyncGenerator, FrozenSet, Optional, Set
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.role import Role, UserRole
from app.services.auth_service import AuthService


# ─────────────────────────────────────────────────────────────────────────────
# Permission matrix — maps role names to sets of allowed permissions.
#
# Permission format:  "<resource>:<action>"
# Wildcard:           "*"  (tenant_admin only)
#
# Roles (least → most privileged):
#   viewer        — read-only access
#   esg_manager   — can enter & view data
#   esg_admin     — full ESG ops, no user/tenant admin
#   tenant_admin  — full access including settings & user management
# ─────────────────────────────────────────────────────────────────────────────

ROLE_PERMISSIONS: dict[str, FrozenSet[str]] = {
    "viewer": frozenset({
        "data:read",
        "indicators:read",
        "scores:read",
        "reports:read",
        "organizations:read",
        "materiality:read",
        "risks:read",
        "carbon:read",
        "taxonomy:read",
        "compliance:read",
    }),
    "esg_manager": frozenset({
        # inherits viewer
        "data:read", "data:write",
        "indicators:read", "indicators:write",
        "scores:read",
        "reports:read",
        "organizations:read",
        "materiality:read", "materiality:write",
        "risks:read", "risks:write",
        "carbon:read", "carbon:write",
        "taxonomy:read",
        "compliance:read",
        "data_entry:write",
        "validation:read",
    }),
    "esg_admin": frozenset({
        # inherits esg_manager + extras
        "data:read", "data:write", "data:delete",
        "indicators:read", "indicators:write", "indicators:delete",
        "scores:read", "scores:calculate",
        "reports:read", "reports:generate", "reports:delete",
        "organizations:read", "organizations:write",
        "materiality:read", "materiality:write", "materiality:delete",
        "risks:read", "risks:write", "risks:delete",
        "carbon:read", "carbon:write",
        "taxonomy:read", "taxonomy:write",
        "compliance:read", "compliance:write",
        "data_entry:write",
        "validation:read", "validation:write",
        "audit:read",
        "connectors:read", "connectors:write",
        "users:read",
        "settings:read",
    }),
    "tenant_admin": frozenset({
        # full access — wildcard checked explicitly in has_permission()
        "*",
    }),
}

# Roles seeded in the DB at platform startup (system roles)
SYSTEM_ROLES: FrozenSet[str] = frozenset(ROLE_PERMISSIONS.keys())


# ─────────────────────────────────────────────────────────────────────────────
# Helper — check one role against a permission
# ─────────────────────────────────────────────────────────────────────────────

def _role_has_permission(role_name: str, permission: str) -> bool:
    """Return True if *role_name* grants *permission*."""
    perms = ROLE_PERMISSIONS.get(role_name, frozenset())
    return "*" in perms or permission in perms


# ─────────────────────────────────────────────────────────────────────────────
# Helper — load all active role names for a user
# ─────────────────────────────────────────────────────────────────────────────

async def get_user_role_names(user: User, db: AsyncSession) -> Set[str]:
    """
    Return the set of role names currently active for *user*.

    Sources (merged):
    1. user.role  — primary role (FK)
    2. user_roles — additional roles (many-to-many), respecting expiry
    """
    role_names: Set[str] = set()
    now = datetime.now(timezone.utc)

    # 1. Primary role (eager-loadable via selectinload, but also check directly)
    if user.role_id is not None:
        # Load the role if not already loaded
        if user.role is None:
            role_result = await db.execute(
                select(Role).where(Role.id == user.role_id)
            )
            primary_role = role_result.scalar_one_or_none()
        else:
            primary_role = user.role

        if primary_role:
            role_names.add(primary_role.name)

    # 2. Additional roles via user_roles
    user_roles_result = await db.execute(
        select(UserRole)
        .where(UserRole.user_id == user.id)
        .options(selectinload(UserRole.role))
    )
    user_role_rows = user_roles_result.scalars().all()

    for ur in user_role_rows:
        # Skip expired roles
        if ur.expires_at is not None:
            expires = ur.expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if now > expires:
                continue

        if ur.role:
            role_names.add(ur.role.name)

    return role_names


# ─────────────────────────────────────────────────────────────────────────────
# Core dependencies
# ─────────────────────────────────────────────────────────────────────────────

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current authenticated user from database.

    Extracts user_id from request.state (set by AuthMiddleware), fetches the
    full User object from DB (with primary role eagerly loaded).

    Raises:
        HTTPException 401: If not authenticated
        HTTPException 404: If user not found in database
    """
    user_id = getattr(request.state, "user_id", None)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # Load user with primary role in one query
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .options(selectinload(User.role))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current authenticated user and verify they are active.

    Raises:
        HTTPException 403: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    return current_user


async def get_optional_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> "User | None":
    """
    Same as get_current_user but returns None instead of raising 401.
    Use for endpoints that support both authenticated and anonymous access.
    """
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        return None
    try:
        result = await db.execute(
            select(User)
            .where(User.id == user_id)
            .options(selectinload(User.role))
        )
        return result.scalar_one_or_none()
    except Exception:
        return None


async def get_current_tenant_id(request: Request) -> UUID:
    """
    Get current tenant ID from request state.

    Raises:
        HTTPException 401: If not authenticated
    """
    tenant_id = getattr(request.state, "tenant_id", None)

    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant context not found",
        )

    return tenant_id


async def get_current_user_id(request: Request) -> UUID:
    """
    Get current user ID from request state.

    Raises:
        HTTPException 401: If not authenticated
    """
    user_id = getattr(request.state, "user_id", None)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User context not found",
        )

    return user_id


# ─────────────────────────────────────────────────────────────────────────────
# RBAC — Permission & Role guards
# ─────────────────────────────────────────────────────────────────────────────

def require_permission(permission: str):
    """
    Dependency factory — check that the current user has *permission*.

    Usage::

        @router.delete("/data/{id}")
        async def delete_data(
            id: UUID,
            user: User = Depends(require_permission("data:delete"))
        ):
            ...

    The check is additive across all roles the user holds.
    tenant_admin always passes (wildcard).
    """
    async def _checker(
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        role_names = await get_user_role_names(current_user, db)

        # No roles assigned yet → deny (fail-secure)
        if not role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission refusée : {permission} — aucun rôle assigné",
            )

        granted = any(_role_has_permission(r, permission) for r in role_names)

        if not granted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission requise : {permission}",
            )

        return current_user

    return _checker


def require_role(role: str):
    """
    Dependency factory — check that the current user holds *role* (exact name).

    Usage::

        @router.post("/settings")
        async def update_settings(
            user: User = Depends(require_role("tenant_admin"))
        ):
            ...
    """
    async def _checker(
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        role_names = await get_user_role_names(current_user, db)

        if role not in role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rôle requis : {role}",
            )

        return current_user

    return _checker


def require_any_role(*roles: str):
    """
    Dependency factory — user must hold **at least one** of the given roles.

    Usage::

        @router.post("/scores/calculate")
        async def calc(
            user: User = Depends(require_any_role("tenant_admin", "esg_admin"))
        ):
            ...
    """
    role_set = set(roles)

    async def _checker(
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        user_roles = await get_user_role_names(current_user, db)

        # tenant_admin wildcard — always passes
        if "tenant_admin" in user_roles:
            return current_user

        if not user_roles.intersection(role_set):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Un des rôles suivants est requis : {', '.join(roles)}",
            )

        return current_user

    return _checker


# ─────────────────────────────────────────────────────────────────────────────
# Convenience shorthand
# ─────────────────────────────────────────────────────────────────────────────

#: Shorthand — require tenant_admin role
require_admin = require_role("tenant_admin")

#: Shorthand — require esg_admin or tenant_admin
require_esg_admin = require_any_role("tenant_admin", "esg_admin")

#: Shorthand — require any operational role (esg_manager+)
require_esg_operator = require_any_role("tenant_admin", "esg_admin", "esg_manager")

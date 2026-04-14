"""
Système de Permissions RBAC Centralisé
========================================
Fournit des dépendances FastAPI pour contrôler l'accès aux endpoints
selon le rôle de l'utilisateur et la hiérarchie des rôles.

Utilisation dans un endpoint :
    from app.core.permissions import require_role, Roles

    @router.get("/admin/users")
    async def list_users(
        _: None = Depends(require_role(Roles.TENANT_ADMIN)),
        db: AsyncSession = Depends(get_db),
    ):
        ...

    # Accès multi-rôles :
    @router.post("/data")
    async def create_data(
        _: None = Depends(require_role(Roles.DATA_ENTRY, Roles.ESG_MANAGER)),
        ...
    ):
        ...

    # Accès avec lecture du user courant :
    @router.get("/profile")
    async def get_profile(
        user: User = Depends(get_current_user),
        ...
    ):
        ...
"""
from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.models.role import Role

logger = logging.getLogger(__name__)


# ─── Constantes de rôles ─────────────────────────────────────────────────────

class Roles:
    """Noms des rôles système. Correspondent à la colonne Role.name en DB."""
    TENANT_ADMIN = "tenant_admin"
    ESG_ADMIN    = "esg_admin"
    ESG_MANAGER  = "esg_manager"
    DATA_ENTRY   = "data_entry"
    VIEWER       = "viewer"

    # Alias pratiques
    ADMIN_OR_ABOVE = (TENANT_ADMIN, ESG_ADMIN)
    MANAGER_OR_ABOVE = (TENANT_ADMIN, ESG_ADMIN, ESG_MANAGER)
    ENTRY_OR_ABOVE = (TENANT_ADMIN, ESG_ADMIN, ESG_MANAGER, DATA_ENTRY)
    ALL = (TENANT_ADMIN, ESG_ADMIN, ESG_MANAGER, DATA_ENTRY, VIEWER)


# ─── Hiérarchie des rôles (plus le chiffre est élevé, plus le rôle est puissant) ─

ROLE_HIERARCHY: dict[str, int] = {
    Roles.VIEWER:       1,
    Roles.DATA_ENTRY:   2,
    Roles.ESG_MANAGER:  3,
    Roles.ESG_ADMIN:    4,
    Roles.TENANT_ADMIN: 5,
}


# ─── Dépendance : récupérer l'utilisateur courant ────────────────────────────

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Retourne l'objet User complet depuis la DB pour la requête courante.
    Lance 401 si non authentifié, 404 si user supprimé.
    """
    user_id: Optional[UUID] = getattr(request.state, "user_id", None)
    tenant_id: Optional[UUID] = getattr(request.state, "tenant_id", None)

    if not user_id or not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Non authentifié",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.tenant_id == tenant_id,
            User.is_active == True,
        )
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable ou inactif",
        )

    return user


# ─── Dépendance : vérification du rôle ───────────────────────────────────────

def require_role(*allowed_roles: str):
    """
    Dépendance FastAPI qui vérifie que l'utilisateur possède l'un des rôles
    autorisés (ou un rôle de niveau supérieur selon la hiérarchie).

    Exemple :
        require_role(Roles.ESG_MANAGER)
        → accepte ESG_MANAGER, ESG_ADMIN, TENANT_ADMIN
        → refuse VIEWER, DATA_ENTRY

    Args:
        *allowed_roles: Noms de rôles minimum requis (ex: Roles.ESG_MANAGER)

    Returns:
        Dépendance FastAPI (Depends-compatible)
    """
    # Niveau minimum parmi les rôles autorisés
    min_level = min(
        ROLE_HIERARCHY.get(r, 0) for r in allowed_roles
    ) if allowed_roles else 0

    async def _check_role(
        request: Request,
        db: AsyncSession = Depends(get_db),
    ) -> None:
        user_id: Optional[UUID] = getattr(request.state, "user_id", None)
        tenant_id: Optional[UUID] = getattr(request.state, "tenant_id", None)

        if not user_id or not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Non authentifié",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Récupérer le rôle via SQL brut pour éviter le conflit de colonnes
        # entre User et Role (qui partagent les colonnes id, tenant_id,
        # created_at, updated_at via les mixins — SQLAlchemy confond les deux)
        result = await db.execute(
            text("""
                SELECT r.name AS role_name
                FROM users u
                LEFT JOIN roles r ON u.role_id = r.id
                WHERE u.id = :user_id
                AND u.tenant_id = :tenant_id
                AND u.is_active = TRUE
            """),
            {"user_id": str(user_id), "tenant_id": str(tenant_id)},
        )
        row = result.first()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Utilisateur introuvable ou inactif",
            )

        role_name: Optional[str] = row.role_name

        # Vérifier la hiérarchie
        user_level = ROLE_HIERARCHY.get(role_name or "", 0)

        if user_level < min_level:
            logger.warning(
                "Accès refusé : user=%s role=%s (level=%d) tente d'accéder à une ressource "
                "requérant level>=%d (rôles: %s) — path=%s",
                user_id, role_name, user_level, min_level, allowed_roles,
                request.url.path,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rôle insuffisant. Requis : {' ou '.join(allowed_roles)}",
            )

        # Stocker le rôle dans request.state pour usage ultérieur
        request.state.user_role = role_name

    return _check_role


# ─── Dépendances prêtes à l'emploi ───────────────────────────────────────────

RequireAdmin     = Depends(require_role(Roles.TENANT_ADMIN))
RequireESGAdmin  = Depends(require_role(*Roles.ADMIN_OR_ABOVE))
RequireManager   = Depends(require_role(*Roles.MANAGER_OR_ABOVE))
RequireDataEntry = Depends(require_role(*Roles.ENTRY_OR_ABOVE))
RequireViewer    = Depends(require_role(*Roles.ALL))


# ─── Vérification propriété d'une ressource ──────────────────────────────────

def require_same_tenant(resource_tenant_id: Optional[UUID], request: Request) -> None:
    """
    Vérifie qu'une ressource appartient au même tenant que l'utilisateur courant.
    À appeler dans le corps d'un endpoint après avoir récupéré la ressource.
    """
    request_tenant_id: Optional[UUID] = getattr(request.state, "tenant_id", None)
    if resource_tenant_id and request_tenant_id and resource_tenant_id != request_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès interdit : ressource d'un autre tenant",
        )


def require_own_resource(
    resource_user_id: Optional[UUID],
    request: Request,
    allow_roles: tuple[str, ...] = Roles.ADMIN_OR_ABOVE,
) -> None:
    """
    Vérifie que la ressource appartient à l'utilisateur courant,
    ou que l'utilisateur a un rôle admin suffisant pour y accéder.
    """
    current_user_id: Optional[UUID] = getattr(request.state, "user_id", None)
    current_role: Optional[str] = getattr(request.state, "user_role", None)

    if resource_user_id == current_user_id:
        return  # OK : propriétaire

    if current_role in allow_roles:
        return  # OK : admin autorisé

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Accès interdit : vous ne pouvez pas modifier cette ressource",
    )

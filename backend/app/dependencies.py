"""
Common dependencies for FastAPI endpoints.
"""
from typing import AsyncGenerator
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.services.auth_service import AuthService


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current authenticated user from database.
    
    Dependency that:
    1. Extracts user_id from request.state (set by AuthMiddleware)
    2. Fetches full User object from database
    3. Returns User instance
    
    Usage:
        @app.get("/me")
        async def get_me(current_user: User = Depends(get_current_user)):
            return {"email": current_user.email}
    
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
    
    auth_service = AuthService(db)
    user = await auth_service.get_current_user(user_id)
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get current authenticated user and verify they are active.
    
    Usage:
        @app.post("/data/upload")
        async def upload_data(
            current_user: User = Depends(get_current_active_user)
        ):
            # User is guaranteed to be active
            ...
    
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
    from typing import Optional
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        return None
    try:
        auth_service = AuthService(db)
        return await auth_service.get_current_user(user_id)
    except HTTPException:
        return None


async def get_current_tenant_id(request: Request) -> UUID:
    """
    Get current tenant ID from request state.
    
    Usage:
        @app.get("/organizations")
        async def get_orgs(tenant_id: UUID = Depends(get_current_tenant_id)):
            return {"tenant_id": tenant_id}
    
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
    
    Usage:
        @app.post("/data")
        async def create_data(user_id: UUID = Depends(get_current_user_id)):
            return {"user_id": user_id}
    
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

def require_permission(permission: str):
    """
    Dependency factory for checking user permissions.
    
    Usage:
        @app.delete("/data/{upload_id}")
        async def delete_upload(
            upload_id: UUID,
            current_user: User = Depends(require_permission("data:delete"))
        ):
            # User has data:delete permission
            ...
    
    Args:
        permission: Permission name (e.g., "data:upload", "score:calculate")
    
    Returns:
        Dependency function that verifies permission
    """
    async def permission_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        """Check if user has required permission."""
        # TODO: Implement actual permission checking once we have roles/permissions
        # For now, just return user
        # 
        # In production:
        # user_permissions = await get_user_permissions(current_user.id)
        # if permission not in user_permissions:
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail=f"Missing permission: {permission}"
        #     )
        
        return current_user
    
    return permission_checker


def require_role(role: str):
    """
    Dependency factory for checking user roles.
    
    Usage:
        @app.post("/tenants/{tenant_id}/settings")
        async def update_settings(
            current_user: User = Depends(require_role("tenant_admin"))
        ):
            # User has tenant_admin role
            ...
    
    Args:
        role: Role name (e.g., "tenant_admin", "esg_manager")
    
    Returns:
        Dependency function that verifies role
    """
    async def role_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        """Check if user has required role."""
        # TODO: Implement actual role checking once we have roles loaded
        # For now, just return user
        #
        # In production:
        # user_roles = await get_user_roles(current_user.id)
        # if role not in user_roles:
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail=f"Missing role: {role}"
        #     )
        
        return current_user
    
    return role_checker
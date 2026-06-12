"""
Tenant middleware for multi-tenancy and Row-Level Security.
"""
from typing import Callable
from uuid import UUID

from fastapi import HTTPException, Request, status
from sqlalchemy import text

from app.db.session import AsyncSessionLocal


class TenantMiddleware:
    """
    Middleware to set PostgreSQL Row-Level Security context.
    
    Sets the tenant_id and user_id in PostgreSQL session variables
    to enable Row-Level Security policies.
    """
    
    async def __call__(self, request: Request, call_next: Callable):
        """
        Set tenant context in database session.
        
        This configures PostgreSQL session variables that are used by
        Row-Level Security policies to filter data.
        """
        # Mirror the same public-path set used by AuthMiddleware
        public_paths = [
            "/",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health",
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/auth/onboard",
            "/api/v1/unsubscribe",
            "/api/v1/status",
            "/api/v1/leads/checklist-csrd",
            "/api/v1/leads/newsletter",
        ]

        if request.url.path in public_paths:
            return await call_next(request)
        
        # Get tenant_id and user_id from request state (set by AuthMiddleware)
        tenant_id = getattr(request.state, "tenant_id", None)
        user_id = getattr(request.state, "user_id", None)
        
        if not tenant_id or not user_id:
            # Auth middleware should have caught this
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing tenant or user context",
            )
        
        # NOTE: We no longer set PostgreSQL session GUCs here. Doing so on a
        # throw-away session inside this middleware would race with the
        # endpoint's request-scoped session: the middleware's connection
        # gets returned to the pool, and the endpoint might pick up a
        # different pooled connection that has no RLS context, which then
        # causes "new row violates row-level security policy" on INSERTs.
        #
        # ``app.db.session.get_db`` now owns the RLS context exclusively —
        # it sets ``app.current_tenant_id`` / ``app.current_user_id`` on the
        # SAME connection that the endpoint will use, with is_local=false so
        # the setting persists across commits within the request, and clears
        # them in its ``finally`` block before returning the connection to
        # the pool. This middleware now just guards that the request has
        # authentication context.

        # Continue to next middleware/endpoint
        response = await call_next(request)
        return response


async def verify_tenant_access(
    request: Request,
    tenant_id: UUID,
) -> bool:
    """
    Verify that current user has access to specified tenant.
    
    Args:
        request: FastAPI request object
        tenant_id: Tenant UUID to verify access to
    
    Returns:
        True if user has access, raises HTTPException otherwise
    
    Usage:
        @app.get("/tenants/{tenant_id}")
        async def get_tenant(
            tenant_id: UUID,
            request: Request,
        ):
            await verify_tenant_access(request, tenant_id)
            # ... endpoint logic
    """
    current_tenant_id = getattr(request.state, "tenant_id", None)
    
    if not current_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    
    if current_tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this tenant",
        )
    
    return True


async def get_tenant_from_request(request: Request) -> UUID:
    """
    Extract tenant_id from request state.
    
    Dependency injection helper.
    """
    tenant_id = getattr(request.state, "tenant_id", None)
    
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant context not found",
        )
    
    return tenant_id
# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/app/api/v1/users.py
# Description: API endpoints pour la gestion des utilisateurs
# ============================================================================

"""
User API endpoints.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_tenant_id, get_current_user_id
from app.schemas.user import (
    RoleAssignmentResponse,
    UserCreateRequest,
    UserListResponse,
    UserResponse,
    UserRoleAssignRequest,
    UserStatsResponse,
    UserUpdateRequest,
    UserWithRolesResponse,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create user",
    description="Create a new user in the tenant.",
)
async def create_user(
    request: UserCreateRequest,
    tenant_id: UUID = Depends(get_current_tenant_id),
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new user.
    
    **Required fields:**
    - email: Valid email address (unique per tenant)
    - password: Min 8 chars, must contain uppercase, lowercase, number, special char
    - first_name: User's first name
    - last_name: User's last name
    
    **Optional fields:**
    - job_title: User's position
    - phone: Contact number
    - locale: Language preference (default: en)
    - timezone: Timezone (default: UTC)
    
    **Returns:**
    - Created user (password excluded)
    
    **Errors:**
    - 409: Email already exists
    - 403: User limit reached for your plan
    - 400: Invalid password (doesn't meet requirements)
    """
    service = UserService(db, tenant_id, current_user_id)
    user = await service.create_user(request)
    return user


@router.get(
    "",
    response_model=UserListResponse,
    summary="List users",
    description="Get paginated list of users with optional filters.",
)
async def list_users(
    skip: int = Query(0, ge=0, description="Number of items to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max items to return"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in email, name"),
    tenant_id: UUID = Depends(get_current_tenant_id),
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    List users with pagination and filters.
    
    **Query parameters:**
    - skip: Pagination offset (default: 0)
    - limit: Items per page (default: 100, max: 1000)
    - is_active: Filter by active/inactive
    - search: Search in email, first name, last name
    
    **Returns:**
    - List of users matching criteria
    - Total count for pagination
    
    **Examples:**
    - GET /users?limit=10
    - GET /users?is_active=true&search=john
    - GET /users?skip=20&limit=20
    """
    service = UserService(db, tenant_id, current_user_id)
    users, total = await service.list_users(
        skip=skip,
        limit=limit,
        is_active=is_active,
        search=search,
    )
    
    return UserListResponse(
        total=total,
        items=[UserResponse.model_validate(user) for user in users],
    )


@router.get(
    "/stats",
    response_model=UserStatsResponse,
    summary="Get user statistics",
    description="Get statistics about users in the tenant.",
)
async def get_user_stats(
    tenant_id: UUID = Depends(get_current_tenant_id),
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user statistics.
    
    **Returns:**
    - total_users: Total number of users
    - active_users: Active users count
    - inactive_users: Inactive users count
    - verified_users: Email-verified users
    - recent_logins: Users logged in last 30 days
    - users_by_role: Count per role
    
    **Use cases:**
    - Dashboard metrics
    - Admin overview
    - Capacity planning
    """
    service = UserService(db, tenant_id, current_user_id)
    stats = await service.get_user_stats()
    return stats


@router.get(
    "/{user_id}",
    response_model=UserWithRolesResponse,
    summary="Get user details",
    description="Get detailed information about a specific user.",
)
async def get_user(
    user_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user by ID with roles.
    
    **Path parameters:**
    - user_id: User UUID
    
    **Returns:**
    - Complete user details
    - Assigned roles with scopes
    - Role expiration dates
    
    **Errors:**
    - 404: User not found
    """
    service = UserService(db, tenant_id, current_user_id)
    user = await service.get_user(user_id, include_roles=True)
    return user


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update user",
    description="Update user details.",
)
async def update_user(
    user_id: UUID,
    request: UserUpdateRequest,
    tenant_id: UUID = Depends(get_current_tenant_id),
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Update an existing user.
    
    **Path parameters:**
    - user_id: User UUID
    
    **Request body:**
    - Any fields to update (all optional)
    - Only provided fields will be updated
    
    **Returns:**
    - Updated user
    
    **Errors:**
    - 404: User not found
    
    **Examples:**
    - Update name: `{"first_name": "Jane", "last_name": "Smith"}`
    - Change job: `{"job_title": "Senior ESG Manager"}`
    - Deactivate: `{"is_active": false}`
    
    **Notes:**
    - Cannot change email (create new user instead)
    - Cannot change password (use /auth/change-password)
    """
    service = UserService(db, tenant_id, current_user_id)
    user = await service.update_user(user_id, request)
    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete user",
    description="Soft delete a user (sets is_active=false).",
)
async def delete_user(
    user_id: UUID,
    tenant_id: UUID = Depends(get_current_tenant_id),
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete (deactivate) a user.
    
    **Path parameters:**
    - user_id: User UUID
    
    **Behavior:**
    - Soft delete (sets is_active=false)
    - User data is preserved
    - User cannot login anymore
    - Can be reactivated via PUT
    
    **Returns:**
    - 204 No Content on success
    
    **Errors:**
    - 404: User not found
    - 400: Cannot delete your own account
    
    **Notes:**
    - Users cannot delete themselves
    - Use PUT to reactivate: `PUT /users/{id}` with `{"is_active": true}`
    """
    service = UserService(db, tenant_id, current_user_id)
    await service.delete_user(user_id)
    return None


@router.post(
    "/{user_id}/roles",
    response_model=RoleAssignmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Assign role to user",
    description="Assign a role to a user with optional organization scope.",
)
async def assign_role(
    user_id: UUID,
    request: UserRoleAssignRequest,
    tenant_id: UUID = Depends(get_current_tenant_id),
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Assign a role to user.
    
    **Path parameters:**
    - user_id: User UUID
    
    **Request body:**
    - role_id: Role UUID to assign
    - org_id: Optional organization scope
    - expires_at: Optional expiration date
    
    **Returns:**
    - Role assignment details
    
    **Errors:**
    - 404: User or role not found
    - 409: Role already assigned
    
    **Examples:**
    - Global role: `{"role_id": "..."}`
    - Scoped role: `{"role_id": "...", "org_id": "..."}`
    - Temporary: `{"role_id": "...", "expires_at": "2025-12-31T23:59:59Z"}`
    
    **Notes:**
    - Can assign same role multiple times with different org scopes
    - System roles available to all tenants
    - Custom roles only within same tenant
    """
    service = UserService(db, tenant_id, current_user_id)
    user_role = await service.assign_role(user_id, request)
    return user_role


@router.delete(
    "/{user_id}/roles/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove role from user",
    description="Remove a role assignment from a user.",
)
async def remove_role(
    user_id: UUID,
    role_id: UUID,
    org_id: Optional[UUID] = Query(None, description="Organization scope"),
    tenant_id: UUID = Depends(get_current_tenant_id),
    current_user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove a role from user.
    
    **Path parameters:**
    - user_id: User UUID
    - role_id: Role UUID
    
    **Query parameters:**
    - org_id: Organization scope (if role was org-scoped)
    
    **Returns:**
    - 204 No Content on success
    
    **Errors:**
    - 404: Role assignment not found
    
    **Notes:**
    - Must match exact assignment (including org_id if scoped)
    - Cannot remove last admin role (future: implement this check)
    """
    service = UserService(db, tenant_id, current_user_id)
    await service.remove_role(user_id, role_id, org_id)
    return None
# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/app/services/user_service.py
# Description: Service de gestion des utilisateurs
# ============================================================================

"""
User service - Business logic for user operations.
"""
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.role import Role
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.user import UserCreateRequest, UserUpdateRequest, UserRoleAssignRequest
from app.utils.security import get_password_hash


class UserService:
    """Service for user operations."""
    
    def __init__(self, db: AsyncSession, tenant_id: UUID, current_user_id: Optional[UUID] = None):
        self.db = db
        self.tenant_id = tenant_id
        self.current_user_id = current_user_id
    
    async def create_user(self, request: UserCreateRequest) -> User:
        """
        Create a new user.
        
        Args:
            request: User creation data
        
        Returns:
            Created User instance
        
        Raises:
            HTTPException 409: If email already exists
            HTTPException 403: If user limit reached
        """
        # Check tenant exists and is active
        tenant = await self.db.get(Tenant, self.tenant_id)
        if not tenant or not tenant.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found or inactive",
            )
        
        # Check if email already exists
        stmt = select(User).where(
            User.tenant_id == self.tenant_id,
            User.email == request.email.lower(),
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        
        # Check user limit
        stmt = select(func.count(User.id)).where(
            User.tenant_id == self.tenant_id
        )
        result = await self.db.execute(stmt)
        user_count = result.scalar() or 0
        
        if not tenant.can_create_user(user_count):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User limit reached for plan {tenant.plan_tier}",
            )
        
        # Create user
        user = User(
            tenant_id=self.tenant_id,
            email=request.email.lower(),
            password_hash=get_password_hash(request.password),
            first_name=request.first_name,
            last_name=request.last_name,
            job_title=request.job_title,
            phone=request.phone,
            locale=request.locale,
            timezone=request.timezone,
            auth_provider="local",
        )
        
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        return user
    
    async def get_user(self, user_id: UUID, include_roles: bool = False) -> User:
        """
        Get user by ID.
        
        Args:
            user_id: User UUID
            include_roles: Include user roles in response
        
        Returns:
            User instance
        
        Raises:
            HTTPException 404: If user not found
        """
        stmt = select(User).where(
            User.id == user_id,
            User.tenant_id == self.tenant_id,
        )
        
        if include_roles:
            stmt = stmt.options(selectinload(User.user_roles))
        
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        
        return user
    
    async def list_users(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> tuple[list[User], int]:
        """
        List users with filters.
        
        Args:
            skip: Number of items to skip
            limit: Max number of items to return
            is_active: Filter by active status
            search: Search in email, first_name, last_name
        
        Returns:
            Tuple of (users list, total count)
        """
        # Base query
        stmt = select(User).where(User.tenant_id == self.tenant_id)
        
        # Apply filters
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)
        
        if search:
            search_term = f"%{search.lower()}%"
            stmt = stmt.where(
                (func.lower(User.email).like(search_term)) |
                (func.lower(User.first_name).like(search_term)) |
                (func.lower(User.last_name).like(search_term))
            )
        
        # Count total
        count_stmt = select(func.count()).select_from(stmt.subquery())
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar() or 0
        
        # Apply pagination
        stmt = stmt.offset(skip).limit(limit).order_by(User.email)
        
        # Execute
        result = await self.db.execute(stmt)
        users = result.scalars().all()
        
        return list(users), total
    
    async def update_user(
        self,
        user_id: UUID,
        request: UserUpdateRequest,
    ) -> User:
        """
        Update user.
        
        Args:
            user_id: User UUID
            request: Update data
        
        Returns:
            Updated User instance
        
        Raises:
            HTTPException 404: If user not found
        """
        user = await self.get_user(user_id)
        
        # Update fields
        update_data = request.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        await self.db.commit()
        await self.db.refresh(user)
        
        return user
    
    async def delete_user(self, user_id: UUID) -> bool:
        """
        Delete user (soft delete by setting is_active=False).
        
        Args:
            user_id: User UUID
        
        Returns:
            True if deleted
        
        Raises:
            HTTPException 404: If user not found
            HTTPException 400: If trying to delete self
        """
        if user_id == self.current_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account",
            )
        
        user = await self.get_user(user_id)
        
        # Soft delete
        user.is_active = False
        await self.db.commit()
        
        return True
    
    async def assign_role(
        self,
        user_id: UUID,
        request: UserRoleAssignRequest,
    ) -> UserRole:
        """
        Assign a role to user.
        
        Args:
            user_id: User UUID
            request: Role assignment data
        
        Returns:
            UserRole instance
        
        Raises:
            HTTPException 404: If user or role not found
            HTTPException 409: If role already assigned
        """
        # Check user exists
        user = await self.get_user(user_id)
        
        # Check role exists and belongs to tenant or is system role
        stmt = select(Role).where(
            Role.id == request.role_id,
            (Role.tenant_id == self.tenant_id) | (Role.is_system_role == True),
        )
        result = await self.db.execute(stmt)
        role = result.scalar_one_or_none()
        
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found",
            )
        
        # Check if already assigned
        stmt = select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == request.role_id,
            UserRole.org_id == request.org_id,
        )
        result = await self.db.execute(stmt)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Role already assigned to user",
            )
        
        # Create assignment
        user_role = UserRole(
            user_id=user_id,
            role_id=request.role_id,
            org_id=request.org_id,
            granted_by=self.current_user_id,
            expires_at=request.expires_at,
        )
        
        self.db.add(user_role)
        await self.db.commit()
        await self.db.refresh(user_role)
        
        return user_role
    
    async def remove_role(
        self,
        user_id: UUID,
        role_id: UUID,
        org_id: Optional[UUID] = None,
    ) -> bool:
        """
        Remove a role from user.
        
        Args:
            user_id: User UUID
            role_id: Role UUID
            org_id: Organization UUID (optional)
        
        Returns:
            True if removed
        
        Raises:
            HTTPException 404: If assignment not found
        """
        # Find assignment
        stmt = select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
            UserRole.org_id == org_id,
        )
        result = await self.db.execute(stmt)
        user_role = result.scalar_one_or_none()
        
        if not user_role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role assignment not found",
            )
        
        await self.db.delete(user_role)
        await self.db.commit()
        
        return True
    
    async def get_user_stats(self) -> dict:
        """
        Get user statistics for the tenant.
        
        Returns:
            Dictionary with user stats
        """
        # Total users
        stmt = select(func.count(User.id)).where(
            User.tenant_id == self.tenant_id
        )
        result = await self.db.execute(stmt)
        total_users = result.scalar() or 0
        
        # Active users
        stmt = select(func.count(User.id)).where(
            User.tenant_id == self.tenant_id,
            User.is_active == True,
        )
        result = await self.db.execute(stmt)
        active_users = result.scalar() or 0
        
        # Verified users
        stmt = select(func.count(User.id)).where(
            User.tenant_id == self.tenant_id,
            User.email_verified_at.isnot(None),
        )
        result = await self.db.execute(stmt)
        verified_users = result.scalar() or 0
        
        # Recent logins (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        stmt = select(func.count(User.id)).where(
            User.tenant_id == self.tenant_id,
            User.last_login_at >= thirty_days_ago,
        )
        result = await self.db.execute(stmt)
        recent_logins = result.scalar() or 0
        
        # Users by role (via User.role_id direct FK)
        stmt = (
            select(Role.name, func.count(User.id))
            .outerjoin(Role, Role.id == User.role_id)
            .where(User.tenant_id == self.tenant_id)
            .group_by(Role.name)
        )
        result = await self.db.execute(stmt)
        users_by_role = {(row[0] or "no_role"): row[1] for row in result.fetchall()}

        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": total_users - active_users,
            "verified_users": verified_users,
            "recent_logins": recent_logins,
            "users_by_role": users_by_role,
        }
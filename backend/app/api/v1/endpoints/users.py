"""
User Management API endpoints.
"""
from uuid import UUID
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.models.role import Role
from app.models.audit_log import AuditLog

router = APIRouter()


class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role_id: UUID
    password: str


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role_id: Optional[UUID] = None
    is_active: Optional[bool] = None


async def log_audit(
    db: AsyncSession,
    user_id: UUID,
    tenant_id: UUID,
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    description: str,
    request: Request
):
    """Helper to log audit events."""
    audit = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        description=description,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(audit)
    await db.commit()


@router.get("/")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    role_id: Optional[UUID] = Query(None),
    is_active: Optional[bool] = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """List all users in tenant with filtering."""
    
    # Get current user
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    current_user = user_result.scalar_one_or_none()
    
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build query
    query = select(User).where(User.tenant_id == current_user.tenant_id)
    
    if search:
        query = query.where(
            or_(
                User.email.ilike(f"%{search}%"),
                User.first_name.ilike(f"%{search}%"),
                User.last_name.ilike(f"%{search}%"),
            )
        )
    
    if role_id:
        query = query.where(User.role_id == role_id)
    
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    
    # Count total
    count_query = select(func.count()).select_from(User).where(
        User.tenant_id == current_user.tenant_id
    )
    total = await db.scalar(count_query) or 0
    
    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(User.created_at.desc())
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    # Get roles for each user
    items = []
    for u in users:
        role = None
        if u.role_id:
            role_query = select(Role).where(Role.id == u.role_id)
            role_result = await db.execute(role_query)
            role = role_result.scalar_one_or_none()
        
        items.append({
            "id": str(u.id),
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "is_active": u.is_active,
            "email_verified_at": u.email_verified_at.isoformat() if u.email_verified_at else None,
            "role": {
                "id": str(role.id),
                "name": role.name,
                "display_name": role.display_name,
            } if role else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/roles")
async def list_roles(
    db: AsyncSession = Depends(get_db),
):
    """List all available roles."""
    
    query = select(Role).order_by(Role.name)
    result = await db.execute(query)
    roles = result.scalars().all()
    
    return {
        "roles": [{
            "id": str(r.id),
            "name": r.name,
            "display_name": r.display_name,
            "description": r.description,
            "permissions": r.permissions,
            "is_system": r.is_system,
        } for r in roles]
    }


@router.post("/")
async def create_user(
    data: UserCreate,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Create a new user (Admin only)."""
    
    # Get current user
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    current_user = user_result.scalar_one_or_none()
    
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if email already exists
    existing_query = select(User).where(
        User.email == data.email,
        User.tenant_id == current_user.tenant_id
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create user
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    new_user = User(
        tenant_id=current_user.tenant_id,
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        role_id=data.role_id,
        hashed_password=pwd_context.hash(data.password),
        is_active=True,
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Log audit
    await log_audit(
        db, user_id, current_user.tenant_id,
        "create", "user", str(new_user.id),
        f"Created user {data.email}",
        request
    )
    
    return {
        "id": str(new_user.id),
        "email": new_user.email,
        "message": "User created successfully"
    }


@router.patch("/{target_user_id}")
async def update_user(
    target_user_id: UUID,
    data: UserUpdate,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Update user (Admin only)."""
    
    # Get current user
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    current_user = user_result.scalar_one_or_none()
    
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get target user
    target_query = select(User).where(
        User.id == target_user_id,
        User.tenant_id == current_user.tenant_id
    )
    target_result = await db.execute(target_query)
    target_user = target_result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    # Update fields
    if data.first_name is not None:
        target_user.first_name = data.first_name
    if data.last_name is not None:
        target_user.last_name = data.last_name
    if data.role_id is not None:
        target_user.role_id = data.role_id
    if data.is_active is not None:
        target_user.is_active = data.is_active
    
    await db.commit()
    
    # Log audit
    await log_audit(
        db, user_id, current_user.tenant_id,
        "update", "user", str(target_user_id),
        f"Updated user {target_user.email}",
        request
    )
    
    return {"message": "User updated successfully"}


@router.delete("/{target_user_id}")
async def delete_user(
    target_user_id: UUID,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete user (Admin only)."""
    
    # Get current user
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    current_user = user_result.scalar_one_or_none()
    
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Cannot delete self
    if target_user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    # Get target user
    target_query = select(User).where(
        User.id == target_user_id,
        User.tenant_id == current_user.tenant_id
    )
    target_result = await db.execute(target_query)
    target_user = target_result.scalar_one_or_none()
    
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    email = target_user.email
    
    await db.delete(target_user)
    await db.commit()
    
    # Log audit
    await log_audit(
        db, user_id, current_user.tenant_id,
        "delete", "user", str(target_user_id),
        f"Deleted user {email}",
        request
    )
    
    return {"message": "User deleted successfully"}


@router.get("/audit-logs")
async def get_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    user_id_filter: Optional[UUID] = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Get audit logs (Admin only)."""
    
    # Get current user
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    current_user = user_result.scalar_one_or_none()
    
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build query
    query = select(AuditLog).where(AuditLog.tenant_id == current_user.tenant_id)
    
    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    if user_id_filter:
        query = query.where(AuditLog.user_id == user_id_filter)
    
    # Count
    count_query = select(func.count()).select_from(AuditLog).where(
        AuditLog.tenant_id == current_user.tenant_id
    )
    total = await db.scalar(count_query) or 0
    
    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(AuditLog.created_at.desc())
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    items = [{
        "id": str(log.id),
        "user_id": str(log.user_id) if log.user_id else None,
        "action": log.action,
        "resource_type": log.resource_type,
        "resource_id": log.resource_id,
        "description": log.description,
        "ip_address": log.ip_address,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    } for log in logs]
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }

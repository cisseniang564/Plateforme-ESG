"""
User Management API endpoints - Simple version without UserService.
"""
from uuid import UUID
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_user_id
from app.models.user import User
from app.models.role import Role
from app.models.audit_log import AuditLog

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserCreate(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role_id: Optional[UUID] = None
    password: str


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role_id: Optional[UUID] = None
    is_active: Optional[bool] = None


def _format_role_name(name: str) -> str:
    """Formate un nom de rôle snake_case en libellé lisible."""
    mapping = {
        "tenant_admin": "Administrateur",
        "esg_admin": "Admin ESG",
        "esg_manager": "Manager ESG",
        "esg_analyst": "Analyste ESG",
        "viewer": "Lecteur",
        "admin": "Administrateur",
        "manager": "Manager",
        "analyst": "Analyste",
    }
    return mapping.get(name, name.replace("_", " ").title())


async def log_audit(
    db: AsyncSession,
    user_id: UUID,
    tenant_id: UUID,
    action: str,
    entity_type: str,
    entity_id: Optional[UUID],
    description: str,
    request: Request
):
    """Helper to log audit events."""
    try:
        audit = AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            change_reason=description,
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(audit)
        await db.commit()
    except Exception:
        # Ne pas bloquer l'opération principale si l'audit échoue
        await db.rollback()


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
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    current_user = user_result.scalar_one_or_none()
    
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
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
    
    count_query = select(func.count()).select_from(User).where(
        User.tenant_id == current_user.tenant_id
    )
    total = await db.scalar(count_query) or 0
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(User.created_at.desc())
    
    result = await db.execute(query)
    users = result.scalars().all()
    
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
                "display_name": _format_role_name(role.name),
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
            "display_name": _format_role_name(r.name),
            "description": r.description or "",
            "is_system": r.is_system_role,
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
    
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    current_user = user_result.scalar_one_or_none()
    
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing_query = select(User).where(
        User.email == data.email,
        User.tenant_id == current_user.tenant_id
    )
    existing_result = await db.execute(existing_query)
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    new_user = User(
        tenant_id=current_user.tenant_id,
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        role_id=data.role_id,
        password_hash=pwd_context.hash(data.password),
        is_active=True,
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    await log_audit(
        db, user_id, current_user.tenant_id,
        "create", "user", new_user.id,
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
    """Update user fields (Admin only)."""

    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    current_user = user_result.scalar_one_or_none()

    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_query = select(User).where(
        User.id == target_user_id,
        User.tenant_id == current_user.tenant_id,
    )
    target_result = await db.execute(target_query)
    target_user = target_result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    if data.first_name is not None:
        target_user.first_name = data.first_name
    if data.last_name is not None:
        target_user.last_name = data.last_name
    if data.role_id is not None:
        target_user.role_id = data.role_id
    if data.is_active is not None:
        target_user.is_active = data.is_active

    await db.commit()

    await log_audit(
        db, user_id, current_user.tenant_id,
        "update", "user", target_user_id,
        f"Updated user {target_user.email}",
        request,
    )

    return {"message": "User updated successfully"}


@router.delete("/{target_user_id}")
async def delete_user(
    target_user_id: UUID,
    request: Request,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Delete a user (Admin only). Cannot delete yourself."""

    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    current_user = user_result.scalar_one_or_none()

    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")

    if target_user_id == user_id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")

    target_query = select(User).where(
        User.id == target_user_id,
        User.tenant_id == current_user.tenant_id,
    )
    target_result = await db.execute(target_query)
    target_user = target_result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    email = target_user.email

    await db.delete(target_user)
    await db.commit()

    await log_audit(
        db, user_id, current_user.tenant_id,
        "delete", "user", target_user_id,
        f"Deleted user {email}",
        request,
    )

    return {"message": "User deleted successfully"}

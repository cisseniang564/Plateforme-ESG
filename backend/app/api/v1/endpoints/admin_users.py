"""Admin endpoints to manage users."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import datetime

from app.db.session import get_db
from app.models.user import User
from app.models.tenant import Tenant
from app.middleware.auth_middleware import get_current_user_id

router = APIRouter()


@router.get("/registrations/recent")
async def get_recent_registrations(
    limit: int = 10,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Obtenir les inscriptions récentes (admin only)."""
    
    # Query users with their tenant info
    query = select(User, Tenant).join(
        Tenant, User.tenant_id == Tenant.id
    ).order_by(User.created_at.desc()).limit(limit)
    
    result = await db.execute(query)
    rows = result.all()
    
    registrations = []
    for user, tenant in rows:
        registrations.append({
            'user_id': str(user.id),
            'email': user.email,
            'full_name': f"{user.first_name} {user.last_name}",
            'company': tenant.name,
            'tenant_id': str(tenant.id),
            'role': user.role,
            'created_at': user.created_at.isoformat() if user.created_at else None,
            'email_verified': user.email_verified,
            'is_active': user.is_active,
            'subscription_status': tenant.subscription_status
        })
    
    return {
        'total': len(registrations),
        'registrations': registrations
    }


@router.get("/stats")
async def get_registration_stats(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db)
):
    """Statistiques des inscriptions."""
    
    # Total users
    total_users_query = select(func.count(User.id))
    total_result = await db.execute(total_users_query)
    total_users = total_result.scalar()
    
    # Total tenants
    total_tenants_query = select(func.count(Tenant.id))
    tenants_result = await db.execute(total_tenants_query)
    total_tenants = tenants_result.scalar()
    
    # Active users
    active_users_query = select(func.count(User.id)).where(User.is_active == True)
    active_result = await db.execute(active_users_query)
    active_users = active_result.scalar()
    
    # Users today
    today = datetime.utcnow().date()
    today_users_query = select(func.count(User.id)).where(
        func.date(User.created_at) == today
    )
    today_result = await db.execute(today_users_query)
    today_users = today_result.scalar()
    
    return {
        'total_users': total_users,
        'total_tenants': total_tenants,
        'active_users': active_users,
        'registrations_today': today_users,
        'verified_emails': 0  # À implémenter
    }

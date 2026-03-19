"""Onboarding endpoints - Tenant setup wizard."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.tenant_onboarding import TenantOnboardingService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])

SECTORS = [
    {"id": "technology", "label": "Technologie & Digital", "icon": "💻"},
    {"id": "finance", "label": "Finance & Assurance", "icon": "🏦"},
    {"id": "industry", "label": "Industrie & Fabrication", "icon": "🏭"},
    {"id": "services", "label": "Services & Conseil", "icon": "🤝"},
    {"id": "retail", "label": "Commerce & Distribution", "icon": "🛒"},
    {"id": "general", "label": "Autre / Général", "icon": "🌍"},
]


class SetupRequest(BaseModel):
    org_name: str
    sector: Optional[str] = "general"


@router.get("/status")
async def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TenantOnboardingService(db, str(current_user.tenant_id))
    return await service.get_status()


@router.post("/setup")
async def setup_tenant(
    body: SetupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TenantOnboardingService(db, str(current_user.tenant_id))
    return await service.setup(org_name=body.org_name, sector=body.sector or "general")


@router.get("/sectors")
async def list_sectors(current_user: User = Depends(get_current_user)):
    return SECTORS

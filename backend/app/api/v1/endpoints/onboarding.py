"""Onboarding endpoints — 5-step wizard for new tenants."""
from typing import Optional, List, Any, Dict
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.tenant_onboarding import TenantOnboardingService

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


# ─── Static catalogs ────────────────────────────────────────────────────────
SECTORS = [
    {"id": "technology", "label": "Technologie & Digital", "icon": "💻"},
    {"id": "finance", "label": "Finance & Assurance", "icon": "🏦"},
    {"id": "industry", "label": "Industrie & Fabrication", "icon": "🏭"},
    {"id": "services", "label": "Services & Conseil", "icon": "🤝"},
    {"id": "retail", "label": "Commerce & Distribution", "icon": "🛒"},
    {"id": "energy", "label": "Énergie & Utilities", "icon": "⚡"},
    {"id": "agro", "label": "Agroalimentaire", "icon": "🌾"},
    {"id": "pharma", "label": "Santé & Pharma", "icon": "💊"},
    {"id": "immo", "label": "Immobilier & Construction", "icon": "🏢"},
    {"id": "general", "label": "Autre / Général", "icon": "🌍"},
]

EMPLOYEE_RANGES = [
    {"value": 30, "label": "< 50 collaborateurs"},
    {"value": 150, "label": "50 - 249"},
    {"value": 350, "label": "250 - 499"},
    {"value": 1500, "label": "500 - 4 999 (ETI)"},
    {"value": 6000, "label": "5 000+ (grand groupe)"},
]

REVENUE_RANGES = [
    {"value": 25_000_000, "label": "< 40 M€"},
    {"value": 90_000_000, "label": "40 - 150 M€"},
    {"value": 300_000_000, "label": "150 - 500 M€"},
    {"value": 1_000_000_000, "label": "500 M€ - 1,5 Md€"},
    {"value": 2_500_000_000, "label": "> 1,5 Md€"},
]


# ─── Request schemas ────────────────────────────────────────────────────────
class ProfileRequest(BaseModel):
    org_name: str = Field(..., min_length=1, max_length=200)
    sector: str = "general"
    employee_count: Optional[int] = Field(default=None, ge=0)
    revenue_eur: Optional[Decimal] = Field(default=None, ge=0)
    country_code: str = Field(default="FR", min_length=2, max_length=2)
    siren: Optional[str] = Field(default=None, min_length=9, max_length=9)
    is_listed: bool = False


class RegulationsRequest(BaseModel):
    codes: List[str] = Field(..., description="Regulation codes to activate (e.g. ['csrd','beges'])")


class IndicatorsRequest(BaseModel):
    codes: List[str] = Field(..., description="Indicator codes to seed (e.g. ['ENV-001'])")


class ImportRequest(BaseModel):
    choice: str = Field(..., pattern="^(template|fec|csv|skip)$")


class LegacySetupRequest(BaseModel):
    """Backward-compat — kept for the old 2-step setup."""
    org_name: str
    sector: Optional[str] = "general"


# ─── Endpoints ──────────────────────────────────────────────────────────────
@router.get("/status", summary="État du wizard")
async def get_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current step + profile + regulations + selected indicators."""
    service = TenantOnboardingService(db, str(current_user.tenant_id))
    return await service.get_status()


@router.get("/sectors", summary="Liste des secteurs disponibles")
async def list_sectors(current_user: User = Depends(get_current_user)):
    return SECTORS


@router.get("/ranges", summary="Tranches d'effectif et de CA")
async def list_ranges(current_user: User = Depends(get_current_user)):
    return {"employees": EMPLOYEE_RANGES, "revenues": REVENUE_RANGES}


@router.post("/profile", summary="Étape 1 — Profil entreprise")
async def step_profile(
    body: ProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save the company profile + create/update the primary organization.

    Returns the suggested applicable regulations computed from the profile
    so the frontend can pre-check them on step 2.
    """
    service = TenantOnboardingService(db, str(current_user.tenant_id))
    return await service.set_profile(body.model_dump())


@router.post("/regulations", summary="Étape 2 — Réglementations applicables")
async def step_regulations(
    body: RegulationsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Persist the list of regulations the user confirms as applicable."""
    service = TenantOnboardingService(db, str(current_user.tenant_id))
    return await service.set_regulations(body.codes)


@router.get("/indicators/suggested", summary="Indicateurs suggérés pour le profil")
async def list_suggested_indicators(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List of indicators tailored to the tenant's profile + regulations."""
    service = TenantOnboardingService(db, str(current_user.tenant_id))
    indicators = await service.list_suggested_indicators()
    return {"indicators": indicators}


@router.post("/indicators", summary="Étape 3 — Sélection des indicateurs")
async def step_indicators(
    body: IndicatorsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Seed the selected indicators in the database."""
    service = TenantOnboardingService(db, str(current_user.tenant_id))
    return await service.select_indicators(body.codes)


@router.post("/import", summary="Étape 4 — Choix de l'import initial")
async def step_import(
    body: ImportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Record the user's data import choice (fec / csv / skip)."""
    service = TenantOnboardingService(db, str(current_user.tenant_id))
    return await service.set_import_choice(body.choice)


@router.post("/complete", summary="Étape 5 — Finaliser l'onboarding")
async def step_complete(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Flag the tenant's onboarding as completed. After this call the user
    is routed to the dashboard.
    """
    service = TenantOnboardingService(db, str(current_user.tenant_id))
    return await service.mark_complete()


# ─── Legacy single-shot setup (kept for old clients) ───────────────────────
@router.post("/setup", summary="(Legacy) Setup en 1 étape")
async def legacy_setup(
    body: LegacySetupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = TenantOnboardingService(db, str(current_user.tenant_id))
    return await service.setup(org_name=body.org_name, sector=body.sector or "general")

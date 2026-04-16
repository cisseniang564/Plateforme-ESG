"""Sector templates API — list and apply pre-configured ESG indicator sets."""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.indicator import Indicator
from app.services.tenant_onboarding import _BASE_INDICATORS, _SECTOR_EXTRA

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sector-templates", tags=["Sector Templates"])


# Template metadata with ESG weights and descriptions
TEMPLATE_META = {
    "general": {
        "name": "Général",
        "icon": "🏢",
        "description": "Template universel avec les 14 indicateurs ESG fondamentaux (ESRS E1, S1, G1).",
        "env_weight": 40, "social_weight": 35, "gov_weight": 25,
        "indicators": _BASE_INDICATORS,
        "color": "gray",
    },
    "technology": {
        "name": "Technologie & Digital",
        "icon": "💻",
        "description": "Pour les ESN, éditeurs logiciels et entreprises tech. Focus e-waste, datacenters, cybersécurité.",
        "env_weight": 35, "social_weight": 40, "gov_weight": 25,
        "indicators": _BASE_INDICATORS + _SECTOR_EXTRA.get("technology", []),
        "color": "blue",
    },
    "finance": {
        "name": "Finance & Assurance",
        "icon": "🏦",
        "description": "Pour les banques, assureurs et gestionnaires d'actifs. Alignement SFDR et EU Taxonomy.",
        "env_weight": 30, "social_weight": 35, "gov_weight": 35,
        "indicators": _BASE_INDICATORS + _SECTOR_EXTRA.get("finance", []),
        "color": "green",
    },
    "industry": {
        "name": "Industrie & Manufacturing",
        "icon": "🏭",
        "description": "Pour les industriels et fabricants. Focus Scope 3, déchets, sécurité au travail.",
        "env_weight": 50, "social_weight": 30, "gov_weight": 20,
        "indicators": _BASE_INDICATORS + _SECTOR_EXTRA.get("industry", []),
        "color": "orange",
    },
    "services": {
        "name": "Services & Conseil",
        "icon": "🤝",
        "description": "Pour les cabinets de conseil, ESS et sociétés de services. Focus carbone par salarié, télétravail.",
        "env_weight": 30, "social_weight": 45, "gov_weight": 25,
        "indicators": _BASE_INDICATORS + _SECTOR_EXTRA.get("services", []),
        "color": "purple",
    },
    "retail": {
        "name": "Commerce & Distribution",
        "icon": "🛒",
        "description": "Pour les enseignes de distribution et retail. Focus produits écoresponsables, supply chain.",
        "env_weight": 40, "social_weight": 35, "gov_weight": 25,
        "indicators": _BASE_INDICATORS + _SECTOR_EXTRA.get("retail", []),
        "color": "red",
    },
    "immo": {
        "name": "Immobilier",
        "icon": "🏠",
        "description": "Pour les foncières, promoteurs et gestionnaires immobiliers. Focus intensité énergétique, certifications.",
        "env_weight": 45, "social_weight": 30, "gov_weight": 25,
        "indicators": _BASE_INDICATORS + _SECTOR_EXTRA.get("immo", []),
        "color": "teal",
    },
}


class TemplateListItem(BaseModel):
    id: str
    name: str
    icon: str
    description: str
    env_weight: int
    social_weight: int
    gov_weight: int
    indicator_count: int
    color: str


class TemplateDetail(BaseModel):
    id: str
    name: str
    icon: str
    description: str
    env_weight: int
    social_weight: int
    gov_weight: int
    indicators: List[dict]
    color: str


class ApplyResult(BaseModel):
    sector: str
    indicators_added: int
    indicators_already_present: int
    total_indicators: int


@router.get("/", response_model=List[TemplateListItem])
async def list_templates(
    current_user: User = Depends(get_current_user),
):
    """List all available sector templates."""
    return [
        TemplateListItem(
            id=sector_id,
            name=meta["name"],
            icon=meta["icon"],
            description=meta["description"],
            env_weight=meta["env_weight"],
            social_weight=meta["social_weight"],
            gov_weight=meta["gov_weight"],
            indicator_count=len(meta["indicators"]),
            color=meta["color"],
        )
        for sector_id, meta in TEMPLATE_META.items()
    ]


@router.get("/{sector_id}", response_model=TemplateDetail)
async def get_template(
    sector_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get full template detail including indicator list."""
    if sector_id not in TEMPLATE_META:
        raise HTTPException(status_code=404, detail=f"Template '{sector_id}' introuvable")
    meta = TEMPLATE_META[sector_id]
    return TemplateDetail(
        id=sector_id,
        name=meta["name"],
        icon=meta["icon"],
        description=meta["description"],
        env_weight=meta["env_weight"],
        social_weight=meta["social_weight"],
        gov_weight=meta["gov_weight"],
        indicators=meta["indicators"],
        color=meta["color"],
    )


@router.post("/{sector_id}/apply", response_model=ApplyResult)
async def apply_template(
    sector_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Apply a sector template to the current tenant.
    Adds missing indicators (non-destructive — never deletes existing data).
    """
    if sector_id not in TEMPLATE_META:
        raise HTTPException(status_code=404, detail=f"Template '{sector_id}' introuvable")

    meta = TEMPLATE_META[sector_id]
    indicators_to_add = meta["indicators"]

    added = 0
    already_present = 0

    for ind_data in indicators_to_add:
        existing = await db.execute(
            select(Indicator).where(
                Indicator.tenant_id == current_user.tenant_id,
                Indicator.code == ind_data["code"],
            )
        )
        if existing.scalar_one_or_none():
            already_present += 1
            continue

        indicator = Indicator(
            tenant_id=current_user.tenant_id,
            code=ind_data["code"],
            name=ind_data["name"],
            pillar=ind_data["pillar"],
            category=ind_data["category"],
            unit=ind_data["unit"],
            framework=ind_data.get("framework", ""),
            description=ind_data["name"],
            is_active=True,
        )
        db.add(indicator)
        added += 1

    # Update tenant sector setting
    from app.models.tenant import Tenant as TenantModel
    tenant = await db.get(TenantModel, current_user.tenant_id)
    if tenant:
        settings_copy = dict(tenant.settings or {})
        settings_copy["sector"] = sector_id
        tenant.settings = settings_copy

    await db.commit()

    return ApplyResult(
        sector=sector_id,
        indicators_added=added,
        indicators_already_present=already_present,
        total_indicators=added + already_present,
    )

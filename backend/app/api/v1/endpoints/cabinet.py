"""
Mode Cabinet — permet à un utilisateur ayant le rôle 'cabinet_admin'
de consulter un résumé ESG de tous ses tenants clients.
"""
import json
import logging
from typing import Dict, Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_active_user
from app.models.user import User
from app.models.tenant import Tenant
from app.models.esg_score import ESGScore
from app.models.materiality import ESGRisk
from app.utils.jwt import create_access_token

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Branding helpers ─────────────────────────────────────────────────────────

# In-memory fallback used when Redis is unavailable.
_branding_store: Dict[str, Dict[str, Any]] = {}

_redis_branding_client = None


async def _get_redis_branding():
    """Lazy Redis client initialization for branding storage."""
    global _redis_branding_client
    if _redis_branding_client is None:
        try:
            import redis.asyncio as aioredis
            from app.config import settings
            raw_url = getattr(settings, "REDIS_URL", None)
            url = str(raw_url) if raw_url else "redis://redis:6379/0"
            _redis_branding_client = aioredis.from_url(url, decode_responses=True)
        except Exception as exc:
            logger.warning("Redis unavailable for cabinet branding: %s", exc)
            return None
    return _redis_branding_client


_DEFAULT_BRANDING: Dict[str, Any] = {
    "logo_url": None,
    "primary_color": "#059669",
    "company_name": "ESGFlow",
}


async def _read_branding(tenant_id: str) -> Dict[str, Any]:
    redis = await _get_redis_branding()
    if redis:
        try:
            raw = await redis.get(f"cabinet_branding:{tenant_id}")
            if raw:
                return {**_DEFAULT_BRANDING, **json.loads(raw)}
        except Exception as exc:
            logger.warning("Branding Redis read error: %s", exc)
    # Fallback
    return {**_DEFAULT_BRANDING, **_branding_store.get(tenant_id, {})}


async def _write_branding(tenant_id: str, data: Dict[str, Any]) -> None:
    redis = await _get_redis_branding()
    if redis:
        try:
            await redis.set(f"cabinet_branding:{tenant_id}", json.dumps(data))
            return
        except Exception as exc:
            logger.warning("Branding Redis write error: %s", exc)
    # Fallback
    _branding_store[tenant_id] = data


class TenantSummary(BaseModel):
    id: str
    name: str
    slug: str
    plan_tier: str
    score_overall: Optional[float]
    score_environmental: Optional[float]
    score_social: Optional[float]
    score_governance: Optional[float]
    last_score_date: Optional[str]
    risks_count: int
    pending_audit: bool


class SwitchTenantResponse(BaseModel):
    access_token: str
    token_type: str
    tenant_id: str
    tenant_name: str


class BrandingPayload(BaseModel):
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    company_name: Optional[str] = None


class BrandingResponse(BaseModel):
    logo_url: Optional[str]
    primary_color: str
    company_name: str


@router.get("/clients", response_model=List[TenantSummary])
async def list_cabinet_clients(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retourne la liste des tenants associés à l'utilisateur cabinet.

    Cherche tous les enregistrements User ayant le même email que current_user
    dans la table User (multi-tenant) et retourne leurs tenants respectifs.
    """
    # Trouver tous les User partageant le même email (multi-tenant)
    users_result = await db.execute(
        select(User).where(
            User.email == current_user.email,
            User.is_active == True,
        )
    )
    all_users = users_result.scalars().all()

    # Collecter les tenant_id distincts (en excluant le tenant courant pour ne pas dupliquer)
    tenant_ids = list({u.tenant_id for u in all_users if u.tenant_id is not None})

    if not tenant_ids:
        return []

    # Charger les tenants
    tenants_result = await db.execute(
        select(Tenant).where(Tenant.id.in_(tenant_ids))
    )
    tenants = tenants_result.scalars().all()

    summaries: List[TenantSummary] = []

    for tenant in tenants:
        # Dernier ESGScore pour ce tenant
        last_score_result = await db.execute(
            select(ESGScore)
            .where(ESGScore.tenant_id == tenant.id)
            .order_by(ESGScore.calculation_date.desc())
            .limit(1)
        )
        last_score = last_score_result.scalar_one_or_none()

        # Nombre de risques actifs
        risks_count_result = await db.execute(
            select(func.count(ESGRisk.id)).where(
                ESGRisk.tenant_id == tenant.id,
                ESGRisk.status == "active",
            )
        )
        risks_count = risks_count_result.scalar() or 0

        summaries.append(
            TenantSummary(
                id=str(tenant.id),
                name=tenant.name,
                slug=tenant.slug,
                plan_tier=tenant.plan_tier,
                score_overall=last_score.overall_score if last_score else None,
                score_environmental=last_score.environmental_score if last_score else None,
                score_social=last_score.social_score if last_score else None,
                score_governance=last_score.governance_score if last_score else None,
                last_score_date=str(last_score.calculation_date) if last_score else None,
                risks_count=risks_count,
                pending_audit=False,
            )
        )

    return summaries


@router.post("/switch-tenant/{tenant_id}", response_model=SwitchTenantResponse)
async def switch_tenant(
    tenant_id: UUID,
    response: Response,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Émet un nouveau JWT pour le tenant cible si l'utilisateur y a bien un compte.
    Le token est posé dans le cookie httpOnly `access_token` (la valeur reste
    dans la réponse pour compatibilité descendante, mais le client n'en a plus
    besoin — il vit dans le cookie).
    """
    # Vérifier que l'utilisateur a un compte dans ce tenant
    target_user_result = await db.execute(
        select(User).where(
            User.email == current_user.email,
            User.tenant_id == tenant_id,
            User.is_active == True,
        )
    )
    target_user = target_user_result.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas accès à ce tenant.",
        )

    # Charger le tenant cible
    tenant = await db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant introuvable.",
        )

    # Émettre un nouveau JWT pour le tenant cible
    access_token = create_access_token(
        subject=target_user.email,
        tenant_id=tenant_id,
        user_id=target_user.id,
    )

    # Set the httpOnly cookie so the SPA picks up the new identity on reload
    from app.config import settings as _s
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=_s.is_production,
        samesite="lax",
        max_age=_s.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return SwitchTenantResponse(
        access_token=access_token,
        token_type="bearer",
        tenant_id=str(tenant_id),
        tenant_name=tenant.name,
    )


@router.get("/branding", response_model=BrandingResponse)
async def get_branding(
    current_user: User = Depends(get_current_active_user),
):
    """
    Retourne le branding personnalisé du cabinet (logo, couleur, nom).
    Valeurs par défaut si aucun branding n'a encore été configuré.
    """
    tenant_id = str(current_user.tenant_id)
    data = await _read_branding(tenant_id)
    return BrandingResponse(
        logo_url=data.get("logo_url"),
        primary_color=data.get("primary_color") or _DEFAULT_BRANDING["primary_color"],
        company_name=data.get("company_name") or _DEFAULT_BRANDING["company_name"],
    )


@router.put("/branding", response_model=BrandingResponse)
async def update_branding(
    payload: BrandingPayload,
    current_user: User = Depends(get_current_active_user),
):
    """
    Met à jour le branding personnalisé du cabinet.
    Seuls les champs fournis écrasent les valeurs existantes.
    """
    tenant_id = str(current_user.tenant_id)
    current = await _read_branding(tenant_id)

    # Apply only the fields that were explicitly provided
    if payload.logo_url is not None:
        current["logo_url"] = payload.logo_url
    if payload.primary_color is not None:
        current["primary_color"] = payload.primary_color
    if payload.company_name is not None:
        current["company_name"] = payload.company_name

    await _write_branding(tenant_id, current)

    return BrandingResponse(
        logo_url=current.get("logo_url"),
        primary_color=current.get("primary_color") or _DEFAULT_BRANDING["primary_color"],
        company_name=current.get("company_name") or _DEFAULT_BRANDING["company_name"],
    )

"""SSO configuration and authentication endpoints."""
import logging
from typing import Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models.sso_config import SSOConfig
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sso", tags=["SSO"])


# ─── Pydantic schemas ───────────────────────────────────────────────────────────

class SSOConfigCreate(BaseModel):
    provider_name: str
    provider_type: str = "oidc"
    issuer_url: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None  # Plaintext, stored encrypted
    scopes: str = "openid email profile"
    email_attribute: str = "email"
    first_name_attribute: str = "given_name"
    last_name_attribute: str = "family_name"
    allowed_domains: Optional[str] = None
    is_enabled: bool = True


class SSOConfigResponse(BaseModel):
    id: str
    provider_name: str
    provider_type: str
    issuer_url: Optional[str]
    client_id: Optional[str]
    scopes: str
    email_attribute: str
    first_name_attribute: str
    last_name_attribute: str
    allowed_domains: Optional[str]
    is_enabled: bool
    created_at: str


def _encrypt_secret(secret: str) -> str:
    """Simple base64 encoding — replace with Fernet in production."""
    import base64
    return base64.b64encode(secret.encode()).decode()


def _decrypt_secret(enc: str) -> str:
    import base64
    return base64.b64decode(enc.encode()).decode()


# ─── Admin endpoints (require JWT) ─────────────────────────────────────────────

@router.get("/config", response_model=Optional[SSOConfigResponse])
async def get_sso_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get SSO configuration for the current tenant."""
    result = await db.execute(
        select(SSOConfig).where(SSOConfig.tenant_id == current_user.tenant_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        return None
    return _to_response(config)


@router.post("/config", response_model=SSOConfigResponse)
async def create_or_update_sso_config(
    body: SSOConfigCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update SSO configuration for the current tenant."""
    result = await db.execute(
        select(SSOConfig).where(SSOConfig.tenant_id == current_user.tenant_id)
    )
    config = result.scalar_one_or_none()

    enc_secret = _encrypt_secret(body.client_secret) if body.client_secret else None

    if config:
        config.provider_name = body.provider_name
        config.provider_type = body.provider_type
        config.issuer_url = body.issuer_url
        config.client_id = body.client_id
        if body.client_secret:
            config.client_secret_enc = enc_secret
        config.scopes = body.scopes
        config.email_attribute = body.email_attribute
        config.first_name_attribute = body.first_name_attribute
        config.last_name_attribute = body.last_name_attribute
        config.allowed_domains = body.allowed_domains
        config.is_enabled = body.is_enabled
    else:
        config = SSOConfig(
            id=uuid4(),
            tenant_id=current_user.tenant_id,
            provider_name=body.provider_name,
            provider_type=body.provider_type,
            issuer_url=body.issuer_url,
            client_id=body.client_id,
            client_secret_enc=enc_secret,
            scopes=body.scopes,
            email_attribute=body.email_attribute,
            first_name_attribute=body.first_name_attribute,
            last_name_attribute=body.last_name_attribute,
            allowed_domains=body.allowed_domains,
            is_enabled=body.is_enabled,
        )
        db.add(config)

    await db.commit()
    await db.refresh(config)
    return _to_response(config)


@router.delete("/config")
async def delete_sso_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Disable SSO configuration for the current tenant."""
    result = await db.execute(
        select(SSOConfig).where(SSOConfig.tenant_id == current_user.tenant_id)
    )
    config = result.scalar_one_or_none()
    if config:
        config.is_enabled = False
        await db.commit()
    return {"disabled": True}


@router.get("/test-config")
async def test_sso_config(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Test SSO configuration by fetching the OIDC discovery document."""
    result = await db.execute(
        select(SSOConfig).where(SSOConfig.tenant_id == current_user.tenant_id)
    )
    config = result.scalar_one_or_none()
    if not config or not config.issuer_url:
        raise HTTPException(status_code=400, detail="Aucune configuration SSO trouvée")

    discovery_url = config.issuer_url.rstrip("/") + "/.well-known/openid-configuration"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(discovery_url)
            resp.raise_for_status()
            discovery = resp.json()
        return {
            "status": "ok",
            "issuer": discovery.get("issuer"),
            "authorization_endpoint": discovery.get("authorization_endpoint"),
            "token_endpoint": discovery.get("token_endpoint"),
            "supported_scopes": discovery.get("scopes_supported", []),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de contacter le provider: {exc}",
        )


# ─── Helpers ────────────────────────────────────────────────────────────────────

def _to_response(config: SSOConfig) -> SSOConfigResponse:
    return SSOConfigResponse(
        id=str(config.id),
        provider_name=config.provider_name,
        provider_type=config.provider_type,
        issuer_url=config.issuer_url,
        client_id=config.client_id,
        scopes=config.scopes or "openid email profile",
        email_attribute=config.email_attribute,
        first_name_attribute=config.first_name_attribute,
        last_name_attribute=config.last_name_attribute,
        allowed_domains=config.allowed_domains,
        is_enabled=config.is_enabled,
        created_at=config.created_at.isoformat(),
    )

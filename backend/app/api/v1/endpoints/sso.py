"""SSO configuration and authentication endpoints."""
import logging
from typing import Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.config import settings
from app.core.permissions import Roles
from app.db.session import SystemSessionLocal
from app.dependencies import get_current_user, require_role
from app.services import oidc_service
from app.services.oidc_service import OIDCError
from app.models.sso_config import SSOConfig
from app.models.user import User
from app.services import secret_vault
from app.services.audit_service import log_change

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
    """Chiffre le secret client avec le coffre Fernet de la plateforme."""
    return secret_vault.encrypt(secret)


def _decrypt_secret(enc: str) -> str:
    """Lit un secret chiffré ; les anciennes valeurs (simple base64) restent lisibles."""
    if secret_vault.is_encrypted(enc):
        return secret_vault.decrypt(enc)
    import base64
    return base64.b64decode(enc.encode()).decode()


# ─── Admin endpoints (require JWT) ─────────────────────────────────────────────

def redirect_uri() -> str:
    """URL de retour à déclarer chez le fournisseur d'identité."""
    return settings.APP_URL.rstrip("/") + "/api/v1/sso/callback"


@router.get("/redirect-uri")
async def get_redirect_uri(current_user: User = Depends(require_role(Roles.TENANT_ADMIN))):
    return {"redirect_uri": redirect_uri()}


@router.get("/config", response_model=Optional[SSOConfigResponse])
async def get_sso_config(
    current_user: User = Depends(require_role(Roles.TENANT_ADMIN)),
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
    current_user: User = Depends(require_role(Roles.TENANT_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Create or update SSO configuration for the current tenant."""
    if body.provider_type != "oidc":
        raise HTTPException(status_code=400, detail="Seul OpenID Connect est pris en charge (SAML n'est pas disponible).")
    if body.is_enabled:
        if not body.issuer_url or not body.issuer_url.startswith("https://"):
            raise HTTPException(status_code=400, detail="L'URL du fournisseur doit commencer par https://.")
        if not body.client_id:
            raise HTTPException(status_code=400, detail="Le Client ID est obligatoire.")
        domains = oidc_service.parse_domains(body.allowed_domains)
        if not domains:
            raise HTTPException(status_code=400, detail="Indiquez au moins un domaine e-mail autorisé.")
        # Un domaine ne peut être revendiqué que par un seul espace de travail.
        async with SystemSessionLocal() as sysdb:
            others = (await sysdb.execute(
                select(SSOConfig).where(SSOConfig.is_enabled.is_(True), SSOConfig.tenant_id != current_user.tenant_id)
            )).scalars().all()
        taken = {d for c in others for d in oidc_service.parse_domains(c.allowed_domains)}
        if taken & set(domains):
            raise HTTPException(status_code=409, detail="Un de ces domaines est déjà utilisé par un autre espace de travail.")
    result = await db.execute(
        select(SSOConfig).where(SSOConfig.tenant_id == current_user.tenant_id)
    )
    config = result.scalar_one_or_none()
    if body.is_enabled and not body.client_secret and not (config and config.client_secret_enc):
        raise HTTPException(status_code=400, detail="Le Client Secret est obligatoire.")

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

    await db.flush()
    await log_change(
        db, current_user.tenant_id, "sso_config", config.id, "update", user=current_user,
        new_values={"provider": body.provider_name, "issuer": body.issuer_url,
                    "domains": body.allowed_domains, "enabled": body.is_enabled},
    )
    await db.commit()
    await db.refresh(config)
    return _to_response(config)


@router.delete("/config")
async def delete_sso_config(
    current_user: User = Depends(require_role(Roles.TENANT_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Disable SSO configuration for the current tenant."""
    result = await db.execute(
        select(SSOConfig).where(SSOConfig.tenant_id == current_user.tenant_id)
    )
    config = result.scalar_one_or_none()
    if config:
        config.is_enabled = False
        await log_change(db, current_user.tenant_id, "sso_config", config.id, "update", user=current_user,
                         new_values={"enabled": False})
        await db.commit()
    return {"disabled": True}


@router.get("/test-config")
async def test_sso_config(
    current_user: User = Depends(require_role(Roles.TENANT_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Test SSO configuration by fetching the OIDC discovery document."""
    result = await db.execute(
        select(SSOConfig).where(SSOConfig.tenant_id == current_user.tenant_id)
    )
    config = result.scalar_one_or_none()
    if not config or not config.issuer_url:
        raise HTTPException(status_code=400, detail="Aucune configuration SSO trouvée")

    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            discovery = await oidc_service.discover(config.issuer_url, client)
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


# ─── Connexion SSO (publique : l'utilisateur n'a pas encore de session) ───────────

class SSOStartRequest(BaseModel):
    email: str


def _login_error(code: str) -> RedirectResponse:
    return RedirectResponse(f"{settings.APP_URL.rstrip('/')}/login?sso_error={code}", status_code=302)


@router.post("/start")
async def sso_start(body: SSOStartRequest):
    """Renvoie l'URL de connexion du fournisseur SSO associé au domaine de l'e-mail."""
    email = body.email.strip().lower()
    domain = oidc_service.email_domain(email)
    if not domain:
        raise HTTPException(status_code=400, detail="Adresse e-mail invalide.")
    async with SystemSessionLocal() as db:
        configs = (await db.execute(select(SSOConfig).where(SSOConfig.is_enabled.is_(True)))).scalars().all()
        config = next((c for c in configs if c.provider_type == "oidc" and c.client_id and c.client_secret_enc
                       and c.issuer_url and domain in oidc_service.parse_domains(c.allowed_domains)), None)
    if not config:
        raise HTTPException(status_code=404, detail="Aucun SSO n'est configuré pour ce domaine.")
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            doc = await oidc_service.discover(config.issuer_url, client)
    except (OIDCError, httpx.HTTPError, ValueError) as exc:
        logger.warning("SSO start: découverte impossible pour tenant=%s: %s", config.tenant_id, exc)
        raise HTTPException(status_code=502, detail="Le fournisseur SSO est injoignable.")
    pkce = oidc_service.new_pkce()
    nonce = uuid4().hex
    state = oidc_service.pack_state({"t": str(config.tenant_id), "n": nonce, "v": pkce["verifier"], "e": email})
    url = oidc_service.build_authorization_url(
        doc, client_id=config.client_id, redirect_uri=redirect_uri(), scopes=config.scopes or "openid email profile",
        state=state, nonce=nonce, challenge=pkce["challenge"], login_hint=email,
    )
    return {"authorization_url": url}


@router.get("/callback")
async def sso_callback(request: Request, code: Optional[str] = None, state: Optional[str] = None,
                       error: Optional[str] = None):
    """Retour du fournisseur : échange du code, vérification du jeton, ouverture de session."""
    from app.api.v1.auth import _set_auth_cookies
    from app.schemas.auth import TokenResponse
    from app.utils.jwt import create_access_token, create_refresh_token

    if error or not code or not state:
        return _login_error("denied")
    try:
        st = oidc_service.unpack_state(state)
    except OIDCError:
        return _login_error("expired")

    async with SystemSessionLocal() as db:
        config = (await db.execute(
            select(SSOConfig).where(SSOConfig.tenant_id == st["t"], SSOConfig.is_enabled.is_(True))
        )).scalar_one_or_none()
        if not config or config.provider_type != "oidc" or not config.client_secret_enc:
            return _login_error("config")
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
                doc = await oidc_service.discover(config.issuer_url, client)
                tokens = await oidc_service.exchange_code(
                    doc, code=code, client_id=config.client_id,
                    client_secret=_decrypt_secret(config.client_secret_enc),
                    redirect_uri=redirect_uri(), verifier=st["v"], client=client,
                )
                oidc_service.assert_public_https(doc["jwks_uri"])
                jwks = (await client.get(doc["jwks_uri"])).json()
            claims = oidc_service.verify_id_token(
                tokens["id_token"], jwks, issuer=doc["issuer"], client_id=config.client_id, nonce=st["n"],
            )
            email = oidc_service.extract_email(claims, config.email_attribute or "email")
        except (OIDCError, httpx.HTTPError, ValueError, KeyError) as exc:
            logger.warning("SSO callback refusé (tenant=%s): %s", st.get("t"), exc)
            return _login_error("failed")

        # L'adresse doit appartenir à un domaine autorisé de CE client et à un compte existant et actif.
        if not oidc_service.email_allowed(email, config.allowed_domains):
            return _login_error("domain")
        user = (await db.execute(
            select(User).where(User.tenant_id == config.tenant_id, User.email == email)
        )).scalar_one_or_none()
        if not user or not user.is_active:
            return _login_error("no_account")
        from app.models.tenant import Tenant
        tenant = await db.get(Tenant, user.tenant_id)
        if not tenant or not tenant.is_active:
            return _login_error("no_account")
        u_email, u_tenant, u_id = user.email, user.tenant_id, user.id
        try:
            user.update_last_login()
            await log_change(
                db, user.tenant_id, "sso_login", user.id, "sso_login", user=user,
                new_values={"provider": config.provider_name},
                ip_address=request.client.host if request.client else None,
            )
            await db.commit()
        except Exception:
            await db.rollback()
        access = create_access_token(subject=u_email, tenant_id=u_tenant, user_id=u_id)
        refresh = create_refresh_token(subject=u_email, tenant_id=u_tenant, user_id=u_id)

    resp = RedirectResponse(f"{settings.APP_URL.rstrip('/')}/app", status_code=302)
    _set_auth_cookies(resp, TokenResponse(
        access_token=access, refresh_token=refresh, token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    ))
    return resp

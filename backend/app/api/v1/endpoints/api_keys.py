"""API Key management endpoints."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.api_key import ApiKey
from app.models.user import User

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


class CreateApiKeyRequest(BaseModel):
    name: str
    description: Optional[str] = None
    expires_in_days: Optional[int] = None  # None = no expiry


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    description: Optional[str]
    created_at: str
    last_used_at: Optional[str]
    expires_at: Optional[str]
    is_active: bool


class CreateApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    full_key: str  # Only returned once at creation
    description: Optional[str]
    created_at: str


def _generate_api_key() -> tuple[str, str, str]:
    """Generate a new API key. Returns (full_key, prefix, hash)."""
    # Generate 32 random bytes → 64 hex chars
    raw = secrets.token_hex(32)
    full_key = f"esgsk_{raw}"
    prefix = full_key[:16]  # "esgsk_" + first 10 chars
    # Use SHA-256 for storage (fast enough for per-request validation)
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, prefix, key_hash


@router.post("/", response_model=CreateApiKeyResponse)
async def create_api_key(
    body: CreateApiKeyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new API key. The full key is only returned once."""
    full_key, prefix, key_hash = _generate_api_key()

    expires_at = None
    if body.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=body.expires_in_days)

    api_key = ApiKey(
        id=uuid4(),
        tenant_id=current_user.tenant_id,
        created_by_user_id=current_user.id,
        name=body.name,
        key_prefix=prefix,
        key_hash=key_hash,
        description=body.description,
        expires_at=expires_at,
        is_active=True,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return CreateApiKeyResponse(
        id=str(api_key.id),
        name=api_key.name,
        key_prefix=api_key.key_prefix,
        full_key=full_key,
        description=api_key.description,
        created_at=api_key.created_at.isoformat(),
    )


@router.get("/", response_model=List[ApiKeyResponse])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all API keys for the current tenant."""
    result = await db.execute(
        select(ApiKey)
        .where(
            ApiKey.tenant_id == current_user.tenant_id,
            ApiKey.is_active == True,  # noqa: E712
        )
        .order_by(ApiKey.created_at.desc())
    )
    keys = result.scalars().all()
    return [
        ApiKeyResponse(
            id=str(k.id),
            name=k.name,
            key_prefix=k.key_prefix,
            description=k.description,
            created_at=k.created_at.isoformat(),
            last_used_at=k.last_used_at.isoformat() if k.last_used_at else None,
            expires_at=k.expires_at.isoformat() if k.expires_at else None,
            is_active=k.is_active,
        )
        for k in keys
    ]


@router.delete("/{key_id}")
async def revoke_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke an API key."""
    result = await db.execute(
        select(ApiKey).where(
            ApiKey.id == key_id,
            ApiKey.tenant_id == current_user.tenant_id,
        )
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.is_active = False
    await db.commit()
    return {"revoked": True}

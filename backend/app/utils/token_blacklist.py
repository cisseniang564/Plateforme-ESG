"""
JWT Token Blacklist — Redis-backed token revocation.

Usage:
    await blacklist_token(jti, expires_in_seconds)
    await is_token_blacklisted(jti)  → bool
"""
from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)

_redis_client = None


async def _get_redis():
    """Lazy Redis client initialization."""
    global _redis_client
    if _redis_client is None:
        try:
            import redis.asyncio as aioredis
            from app.config import settings
            raw_url = getattr(settings, "REDIS_URL", None)
            url = str(raw_url) if raw_url else "redis://redis:6379/0"
            _redis_client = aioredis.from_url(url, decode_responses=True)
        except Exception as e:
            logger.warning("Redis unavailable for token blacklist: %s", e)
            return None
    return _redis_client


async def blacklist_token(jti: str, expires_in: int = 1800) -> bool:
    """
    Add a token JTI to the blacklist with TTL = remaining lifetime.

    Args:
        jti: JWT ID (unique per token — use sub+iat as fallback if no jti claim)
        expires_in: seconds until the token expires (set TTL to avoid Redis bloat)

    Returns:
        True if blacklisted, False if Redis unavailable (fails open — log warning)
    """
    redis = await _get_redis()
    if not redis:
        logger.warning("Token blacklist unavailable — token %s NOT revoked", jti)
        return False
    try:
        key = f"bl:{jti}"
        await redis.setex(key, expires_in, "1")
        return True
    except Exception as e:
        logger.warning("Failed to blacklist token %s: %s", jti, e)
        return False


async def is_token_blacklisted(jti: str) -> bool:
    """
    Check if a token JTI is in the blacklist.

    Returns False if Redis is unavailable (fails open — log warning).
    """
    redis = await _get_redis()
    if not redis:
        return False
    try:
        return await redis.exists(f"bl:{jti}") > 0
    except Exception as e:
        logger.warning("Blacklist check failed for %s: %s", jti, e)
        return False

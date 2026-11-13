"""Jeton de désabonnement : empêche de désabonner l'adresse de quelqu'un d'autre.

Le lien envoyé dans chaque e-mail contient ``token = HMAC-SHA256(SECRET_KEY, "unsub:" + email)``.
Sans ce jeton, l'adresse e-mail seule (publique) ne suffit pas à agir.
"""
from __future__ import annotations

import hashlib
import hmac
import urllib.parse

from app.config import settings


def _norm(email: str) -> str:
    return (email or "").strip().lower()


def make_token(email: str) -> str:
    key = settings.SECRET_KEY.encode()
    return hmac.new(key, b"unsub:" + _norm(email).encode(), hashlib.sha256).hexdigest()[:32]


def verify_token(email: str, token: str | None) -> bool:
    return bool(token) and hmac.compare_digest(make_token(email), token)


def unsubscribe_url(email: str, base_url: str | None = None) -> str:
    base = (base_url or settings.APP_URL).rstrip("/")
    return f"{base}/api/v1/unsubscribe?email={urllib.parse.quote(_norm(email))}&token={make_token(email)}"

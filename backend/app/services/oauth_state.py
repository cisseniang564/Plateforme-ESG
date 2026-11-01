"""
Paramètre « state » des flux OAuth2 (anti-CSRF) : valeur aléatoire à usage unique, liée au client
qui a lancé la connexion et conservée côté serveur (Redis) quelques minutes.

Le client (tenant) est retrouvé à partir de cette valeur serveur, jamais à partir du contenu du
paramètre reçu dans l'URL de retour : sinon n'importe qui pourrait rattacher son propre compte
fournisseur au client de quelqu'un d'autre.
"""
import secrets
from typing import Any, Optional
from uuid import UUID

TTL_SECONDS = 600
_PREFIX = "oauth:state:"


def issue_state(redis_client: Any, provider: str, tenant_id: UUID, user_id: Optional[UUID] = None) -> str:
    """Crée un state à usage unique. Lève RuntimeError si le stockage est indisponible (on échoue fermé)."""
    if redis_client is None:
        raise RuntimeError("Stockage temporaire indisponible")
    nonce = secrets.token_urlsafe(32)
    redis_client.setex(f"{_PREFIX}{provider}:{nonce}", TTL_SECONDS, f"{tenant_id}|{user_id or ''}")
    return nonce


def consume_state(redis_client: Any, provider: str, state: Optional[str]) -> Optional[UUID]:
    """Vérifie et consomme le state. Renvoie le tenant_id, ou None si inconnu, expiré ou déjà utilisé."""
    if redis_client is None or not state or len(state) > 200:
        return None
    key = f"{_PREFIX}{provider}:{state}"
    value = redis_client.get(key)
    if not value:
        return None
    redis_client.delete(key)                      # usage unique, même si la suite échoue
    try:
        return UUID(str(value).split("|", 1)[0])
    except ValueError:
        return None

"""OpenID Connect (Authorization Code + PKCE) pour la connexion SSO d'un client.

Fonctions pures ou presque, sans dépendance à FastAPI, pour pouvoir les tester :
- état de la redirection : chiffré (Fernet) et daté, il porte tenant, nonce et code_verifier ;
- URL de découverte / jeton / JWKS : HTTPS public uniquement (anti-SSRF) ;
- validation du jeton d'identité : signature (JWKS), émetteur, audience, expiration, nonce.
"""
from __future__ import annotations

import base64
import hashlib
import ipaddress
import json
import secrets
import socket
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode, urlparse

import httpx
import jwt

from app.services import secret_vault

STATE_TTL_SECONDS = 600
ALLOWED_ALGS = ["RS256", "RS384", "RS512", "ES256", "ES384", "PS256"]


class OIDCError(Exception):
    """Erreur de connexion SSO, message sûr à afficher/journaliser."""


# ── Sécurité réseau ─────────────────────────────────────────────────────────────

def assert_public_https(url: str) -> None:
    """Refuse tout autre schéma que https et toute adresse privée, locale ou réservée."""
    parsed = urlparse(url or "")
    if parsed.scheme != "https" or not parsed.hostname:
        raise OIDCError("L'adresse du fournisseur doit être en HTTPS.")
    try:
        infos = socket.getaddrinfo(parsed.hostname, parsed.port or 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror as exc:
        raise OIDCError("Adresse du fournisseur introuvable.") from exc
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved
                or ip.is_multicast or ip.is_unspecified):
            raise OIDCError("Adresse du fournisseur non autorisée.")


# ── PKCE / état ─────────────────────────────────────────────────────────────────

def new_pkce() -> Dict[str, str]:
    verifier = secrets.token_urlsafe(64)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return {"verifier": verifier, "challenge": challenge}


def pack_state(payload: Dict[str, Any], now: Optional[float] = None) -> str:
    data = dict(payload, exp=int((now or time.time()) + STATE_TTL_SECONDS))
    return secret_vault.encrypt(json.dumps(data))


def unpack_state(state: str, now: Optional[float] = None) -> Dict[str, Any]:
    try:
        data = json.loads(secret_vault.decrypt(state))
    except Exception as exc:
        raise OIDCError("Session de connexion invalide.") from exc
    if not isinstance(data, dict) or data.get("exp", 0) < (now or time.time()):
        raise OIDCError("Session de connexion expirée, recommencez.")
    return data


# ── Domaines ────────────────────────────────────────────────────────────────────

def parse_domains(allowed_domains: Optional[str]) -> List[str]:
    return [d.strip().lower().lstrip("@") for d in (allowed_domains or "").replace(";", ",").split(",") if d.strip()]


def email_domain(email: str) -> str:
    return email.rsplit("@", 1)[-1].strip().lower() if "@" in email else ""


def email_allowed(email: str, allowed_domains: Optional[str]) -> bool:
    """Vrai seulement si une liste de domaines est définie ET contient le domaine de l'e-mail."""
    domains = parse_domains(allowed_domains)
    return bool(domains) and email_domain(email) in domains


# ── Fournisseur ─────────────────────────────────────────────────────────────────

async def discover(issuer_url: str, client: httpx.AsyncClient) -> Dict[str, Any]:
    assert_public_https(issuer_url)
    resp = await client.get(issuer_url.rstrip("/") + "/.well-known/openid-configuration")
    resp.raise_for_status()
    doc = resp.json()
    for key in ("issuer", "authorization_endpoint", "token_endpoint", "jwks_uri"):
        if not doc.get(key):
            raise OIDCError(f"Document de découverte incomplet ({key}).")
        if key != "issuer":
            assert_public_https(doc[key])
    if doc["issuer"].rstrip("/") != issuer_url.rstrip("/"):
        raise OIDCError("L'émetteur annoncé ne correspond pas à la configuration.")
    return doc


def build_authorization_url(doc: Dict[str, Any], *, client_id: str, redirect_uri: str, scopes: str,
                            state: str, nonce: str, challenge: str, login_hint: Optional[str] = None) -> str:
    params = {
        "response_type": "code", "client_id": client_id, "redirect_uri": redirect_uri,
        "scope": scopes or "openid email profile", "state": state, "nonce": nonce,
        "code_challenge": challenge, "code_challenge_method": "S256",
    }
    if login_hint:
        params["login_hint"] = login_hint
    return doc["authorization_endpoint"] + ("&" if "?" in doc["authorization_endpoint"] else "?") + urlencode(params)


async def exchange_code(doc: Dict[str, Any], *, code: str, client_id: str, client_secret: str,
                        redirect_uri: str, verifier: str, client: httpx.AsyncClient) -> Dict[str, Any]:
    resp = await client.post(doc["token_endpoint"], data={
        "grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri,
        "client_id": client_id, "client_secret": client_secret, "code_verifier": verifier,
    }, headers={"Accept": "application/json"})
    if resp.status_code != 200:
        raise OIDCError("Le fournisseur a refusé l'échange du code.")
    body = resp.json()
    if not body.get("id_token"):
        raise OIDCError("Le fournisseur n'a pas renvoyé de jeton d'identité.")
    return body


def verify_id_token(id_token: str, jwks: Dict[str, Any], *, issuer: str, client_id: str, nonce: str) -> Dict[str, Any]:
    """Vérifie signature, émetteur, audience, expiration et nonce. Lève OIDCError sinon."""
    try:
        header = jwt.get_unverified_header(id_token)
        alg = header.get("alg")
        if alg not in ALLOWED_ALGS:
            raise OIDCError("Algorithme de signature non accepté.")
        keys = [k for k in jwks.get("keys", []) if k.get("kid") == header.get("kid")] or \
               ([k for k in jwks.get("keys", [])] if not header.get("kid") and len(jwks.get("keys", [])) == 1 else [])
        if not keys:
            raise OIDCError("Clé de signature introuvable.")
        key = jwt.PyJWK(keys[0]).key
        claims = jwt.decode(
            id_token, key=key, algorithms=[alg], audience=client_id,
            options={"require": ["exp", "iss", "aud", "sub"], "verify_iss": False},
        )
    except OIDCError:
        raise
    except jwt.PyJWTError as exc:
        raise OIDCError("Jeton d'identité invalide.") from exc
    if str(claims.get("iss", "")).rstrip("/") != issuer.rstrip("/"):
        raise OIDCError("Émetteur du jeton inattendu.")
    if not secrets.compare_digest(str(claims.get("nonce", "")), nonce):
        raise OIDCError("Nonce invalide.")
    return claims


def extract_email(claims: Dict[str, Any], attribute: str = "email") -> str:
    email = str(claims.get(attribute) or "").strip().lower()
    if "@" not in email:
        raise OIDCError("Le fournisseur n'a pas communiqué d'adresse e-mail.")
    if claims.get("email_verified") is False or str(claims.get("email_verified")).lower() == "false":
        raise OIDCError("Adresse e-mail non vérifiée par le fournisseur.")
    return email

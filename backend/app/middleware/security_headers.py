"""
Security Headers Middleware
============================
Ajoute les headers de sécurité HTTP recommandés par OWASP à toutes les réponses.

Headers appliqués :
- Strict-Transport-Security  : Force HTTPS (HSTS)
- X-Frame-Options            : Protection clickjacking
- X-Content-Type-Options     : Désactive MIME sniffing
- X-XSS-Protection           : Protection XSS navigateurs anciens
- Referrer-Policy            : Contrôle des referrers
- Permissions-Policy         : Désactive APIs sensibles du navigateur
- Content-Security-Policy    : CSP adaptée dev/prod
- Cache-Control              : Pas de cache pour les réponses API
"""
import os
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Injecte les headers de sécurité OWASP sur toutes les réponses."""

    def __init__(self, app, environment: str = "production"):
        super().__init__(app)
        self.is_production = environment == "production"

    async def dispatch(self, request: Request, call_next) -> Response:
        response: Response = await call_next(request)

        # ── HSTS : Force HTTPS en production ─────────────────────────────
        if self.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # ── Clickjacking ─────────────────────────────────────────────────
        response.headers["X-Frame-Options"] = "DENY"

        # ── MIME Sniffing ────────────────────────────────────────────────
        response.headers["X-Content-Type-Options"] = "nosniff"

        # ── XSS Protection (legacy browsers) ────────────────────────────
        response.headers["X-XSS-Protection"] = "1; mode=block"

        # ── Referrer Policy ──────────────────────────────────────────────
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # ── Permissions Policy : désactive APIs navigateur sensibles ─────
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), "
            "payment=(), usb=(), magnetometer=(), gyroscope=()"
        )

        # ── Content Security Policy ───────────────────────────────────────
        # Dev : permissif pour le hot-reload Vite
        # Prod : strict, uniquement notre domaine
        if self.is_production:
            csp = (
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self'; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "form-action 'self'; "
                "base-uri 'self';"
            )
        else:
            # Dev : autorise localhost et webpack/vite HMR
            csp = (
                "default-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "img-src 'self' data: https: blob:; "
                "connect-src 'self' ws: wss: http://localhost:* https://localhost:*; "
                "frame-ancestors 'none';"
            )
        response.headers["Content-Security-Policy"] = csp

        # ── Cache Control pour l'API ──────────────────────────────────────
        # Les endpoints /api/* ne doivent pas être mis en cache
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"

        # ── Masquer la technologie serveur ────────────────────────────────
        try:
            del response.headers["Server"]
        except KeyError:
            pass
        try:
            del response.headers["X-Powered-By"]
        except KeyError:
            pass

        return response

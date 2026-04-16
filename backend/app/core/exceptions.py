"""
Custom Exceptions & Global Exception Handlers
===============================================
Exceptions métier centralisées et handlers FastAPI pour des réponses
d'erreur cohérentes sur toute l'API.

Format de réponse d'erreur standardisé :
{
    "error": "CODE_ERREUR",
    "detail": "Message lisible par l'utilisateur",
    "field": "champ_concerné"  (optionnel, pour erreurs de validation)
}
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

logger = logging.getLogger(__name__)


# ─── Exceptions Métier ───────────────────────────────────────────────────────

class ESGFlowException(Exception):
    """Classe de base pour toutes les exceptions métier ESGFlow."""
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "INTERNAL_ERROR"
    detail: str = "Une erreur interne s'est produite."

    def __init__(self, detail: Optional[str] = None, **kwargs: Any):
        self.detail = detail or self.__class__.detail
        for k, v in kwargs.items():
            setattr(self, k, v)
        super().__init__(self.detail)


class NotFoundError(ESGFlowException):
    """Ressource introuvable (404)."""
    status_code = status.HTTP_404_NOT_FOUND
    error_code = "NOT_FOUND"
    detail = "Ressource introuvable."


class UnauthorizedError(ESGFlowException):
    """Authentification requise (401)."""
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "UNAUTHORIZED"
    detail = "Authentification requise."


class ForbiddenError(ESGFlowException):
    """Accès interdit — permissions insuffisantes (403)."""
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "FORBIDDEN"
    detail = "Vous n'avez pas les droits nécessaires pour cette action."


class ConflictError(ESGFlowException):
    """Conflit de données — ressource déjà existante (409)."""
    status_code = status.HTTP_409_CONFLICT
    error_code = "CONFLICT"
    detail = "Une ressource avec ces données existe déjà."


class ValidationError(ESGFlowException):
    """Données invalides (422)."""
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "VALIDATION_ERROR"
    detail = "Les données fournies sont invalides."

    def __init__(self, detail: Optional[str] = None, field: Optional[str] = None):
        super().__init__(detail)
        self.field = field


class TenantError(ESGFlowException):
    """Erreur d'isolation tenant (403)."""
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "TENANT_MISMATCH"
    detail = "Accès interdit : ressource appartenant à un autre tenant."


class RateLimitError(ESGFlowException):
    """Trop de requêtes (429)."""
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    error_code = "RATE_LIMIT_EXCEEDED"
    detail = "Trop de requêtes. Veuillez réessayer dans quelques instants."


class ExternalServiceError(ESGFlowException):
    """Erreur d'un service externe (INSEE, Stripe, OpenAI, etc.) (502)."""
    status_code = status.HTTP_502_BAD_GATEWAY
    error_code = "EXTERNAL_SERVICE_ERROR"
    detail = "Un service externe est temporairement indisponible."


class DataQualityError(ESGFlowException):
    """Données ESG de qualité insuffisante (422)."""
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    error_code = "DATA_QUALITY_ERROR"
    detail = "Les données ESG ne respectent pas les critères de qualité requis."


class PlanLimitError(ESGFlowException):
    """Limite du plan Stripe atteinte (403)."""
    status_code = status.HTTP_403_FORBIDDEN
    error_code = "PLAN_LIMIT_EXCEEDED"
    detail = "Vous avez atteint la limite de votre plan. Mettez à niveau pour continuer."


class FileUploadError(ESGFlowException):
    """Erreur lors de l'upload d'un fichier (400)."""
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "FILE_UPLOAD_ERROR"
    detail = "Le fichier uploadé est invalide ou corrompu."


# ─── Helper : créer une réponse d'erreur standardisée ────────────────────────

def _error_response(
    status_code: int,
    error_code: str,
    detail: str,
    field: Optional[str] = None,
    cors_headers: Optional[dict] = None,
) -> JSONResponse:
    content: dict[str, Any] = {"error": error_code, "detail": detail}
    if field:
        content["field"] = field
    return JSONResponse(
        status_code=status_code,
        content=content,
        headers=cors_headers or {},
    )


def _get_cors_headers(request: Request, cors_origins: list[str]) -> dict[str, str]:
    """Récupère les headers CORS appropriés pour la requête."""
    origin = request.headers.get("origin", "")
    if origin and origin in cors_origins:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
        }
    return {}


# ─── Enregistrement des handlers ─────────────────────────────────────────────

def register_exception_handlers(app: FastAPI, cors_origins: list[str] | None = None) -> None:
    """
    Enregistre tous les handlers d'exception sur l'application FastAPI.
    À appeler dans main.py après création de l'app.

    Usage:
        from app.core.exceptions import register_exception_handlers
        register_exception_handlers(app, settings.CORS_ORIGINS)
    """
    _origins = cors_origins or []

    @app.exception_handler(ESGFlowException)
    async def esgflow_exception_handler(request: Request, exc: ESGFlowException):
        """Handler pour toutes les exceptions métier ESGFlow."""
        cors = _get_cors_headers(request, _origins)
        field = getattr(exc, "field", None)
        return _error_response(exc.status_code, exc.error_code, exc.detail, field, cors)

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """Handler unifié pour les HTTPException FastAPI."""
        cors = _get_cors_headers(request, _origins)
        # Mapper les codes HTTP vers nos codes d'erreur
        error_code_map = {
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            422: "VALIDATION_ERROR",
            429: "RATE_LIMIT_EXCEEDED",
        }
        error_code = error_code_map.get(exc.status_code, "HTTP_ERROR")
        return _error_response(exc.status_code, error_code, str(exc.detail), cors_headers=cors)

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Handler pour les erreurs de validation Pydantic."""
        cors = _get_cors_headers(request, _origins)
        # Extraire le premier message d'erreur lisible
        errors = exc.errors()
        if errors:
            first_error = errors[0]
            field = ".".join(str(loc) for loc in first_error.get("loc", []) if loc != "body")
            detail = first_error.get("msg", "Données invalides")
        else:
            field = None
            detail = "Données de requête invalides"

        return _error_response(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "VALIDATION_ERROR",
            detail,
            field or None,
            cors,
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """Handler catch-all pour les exceptions non prévues."""
        cors = _get_cors_headers(request, _origins)
        logger.exception(
            "Exception non gérée | method=%s path=%s | %s: %s",
            request.method,
            request.url.path,
            type(exc).__name__,
            str(exc),
        )
        # Ne pas exposer les détails en production
        from app.config import settings
        detail = str(exc) if settings.APP_DEBUG else "Une erreur interne s'est produite."
        return _error_response(500, "INTERNAL_ERROR", detail, cors_headers=cors)

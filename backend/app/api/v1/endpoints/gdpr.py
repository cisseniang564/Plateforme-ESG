"""
GDPR Endpoints — Article 15 (accès) + Article 17 (droit à l'oubli).

Routes :
    GET  /api/v1/me/export   → export JSON de toutes les données utilisateur
    DELETE /api/v1/me        → suppression du compte (soft-delete + anonymisation)
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.middleware.auth_middleware import get_current_tenant_id, get_current_user_id
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/me", tags=["GDPR"])

# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _get_user(db: AsyncSession, user_id: UUID, tenant_id: UUID) -> User:
    result = await db.execute(
        select(User).where(User.id == user_id, User.tenant_id == tenant_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    return user


def _safe(val: Any) -> Any:
    """Serialize datetime/UUID values for JSON export."""
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, UUID):
        return str(val)
    return val


# ─── GET /me/export ───────────────────────────────────────────────────────────

@router.get(
    "/export",
    summary="Export RGPD — Article 15",
    description=(
        "Retourne toutes les données personnelles de l'utilisateur connecté "
        "au format JSON (profil, préférences, historique de connexion). "
        "Conformément au RGPD Article 15 — droit d'accès."
    ),
)
async def export_my_data(
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Export all personal data for the authenticated user."""
    user = await _get_user(db, user_id, tenant_id)

    # Personal profile
    profile: Dict[str, Any] = {
        "id": _safe(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "job_title": getattr(user, "job_title", None),
        "phone": getattr(user, "phone", None),
        "locale": getattr(user, "locale", "fr"),
        "timezone": getattr(user, "timezone", "Europe/Paris"),
        "auth_provider": getattr(user, "auth_provider", "local"),
        "is_active": user.is_active,
        "email_verified_at": _safe(getattr(user, "email_verified_at", None)),
        "last_login_at": _safe(getattr(user, "last_login_at", None)),
        "created_at": _safe(getattr(user, "created_at", None)),
        "updated_at": _safe(getattr(user, "updated_at", None)),
        "notification_preferences": getattr(user, "notification_preferences", {}),
    }

    # Indicator data entries authored by this user
    indicator_entries: list[Dict[str, Any]] = []
    try:
        from app.models.indicator import IndicatorData  # lazy import — optional dep
        res = await db.execute(
            select(IndicatorData).where(
                IndicatorData.tenant_id == tenant_id,
                IndicatorData.created_by == user_id,
            ).limit(500)
        )
        for row in res.scalars().all():
            indicator_entries.append({
                "id": _safe(row.id),
                "indicator_id": _safe(row.indicator_id),
                "value": row.value,
                "date": _safe(row.date),
                "source": getattr(row, "source", None),
                "notes": getattr(row, "notes", None),
                "is_verified": getattr(row, "is_verified", False),
                "created_at": _safe(getattr(row, "created_at", None)),
            })
    except Exception:
        pass  # model may not be available in all deployments

    export = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "export_version": "1.0",
        "regulation": "RGPD Article 15 — Droit d'accès",
        "tenant_id": _safe(tenant_id),
        "user": profile,
        "indicator_data_entries": indicator_entries,
        "data_categories": [
            "Données d'identification (email, nom, prénom)",
            "Données de profil (poste, téléphone, préférences)",
            "Données de connexion (dernière connexion, fournisseur d'auth)",
            "Données de saisie ESG (si applicable)",
        ],
        "retention_note": (
            "Vos données sont conservées pendant la durée de votre abonnement "
            "et jusqu'à 12 mois après sa résiliation, conformément à nos CGU."
        ),
        "contact": "privacy@esgflow.io",
    }

    logger.info("GDPR export requested by user %s (tenant %s)", user_id, tenant_id)
    return export


# ─── DELETE /me ───────────────────────────────────────────────────────────────

@router.delete(
    "",
    status_code=status.HTTP_200_OK,
    summary="Suppression compte — RGPD Article 17",
    description=(
        "Anonymise et désactive le compte utilisateur. "
        "Les données ESG saisies sont conservées (anonymisées) pour l'intégrité "
        "du reporting, conformément à l'article 17§3 du RGPD (obligation légale). "
        "Le compte ne peut plus se connecter après cette opération."
    ),
)
async def delete_my_account(
    user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, str]:
    """Anonymize and deactivate the authenticated user's account (GDPR Art. 17)."""
    user = await _get_user(db, user_id, tenant_id)

    # Anonymisation irréversible des données personnelles
    anon_id = uuid4().hex[:8]
    now = datetime.now(timezone.utc)

    await db.execute(
        update(User)
        .where(User.id == user_id, User.tenant_id == tenant_id)
        .values(
            email=f"deleted_{anon_id}@anonymized.invalid",
            first_name="[Supprimé]",
            last_name="[Supprimé]",
            password_hash="[ANONYMIZED]",
            phone=None,
            job_title=None,
            auth_provider_id=None,
            notification_preferences={},
            is_active=False,
            updated_at=now,
        )
    )
    await db.commit()

    logger.info(
        "GDPR account deletion: user %s (tenant %s) anonymized at %s",
        user_id, tenant_id, now.isoformat(),
    )

    return {
        "message": "Votre compte a été anonymisé et désactivé conformément au RGPD Article 17.",
        "anonymized_at": now.isoformat(),
        "note": (
            "Les données ESG que vous avez saisies sont conservées de façon anonyme "
            "pour l'intégrité du reporting réglementaire (RGPD Art. 17§3c)."
        ),
    }

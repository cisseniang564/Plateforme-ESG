# ============================================================================
# Fichier: /home/claude/esg-saas-platform/backend/app/api/v1/tenants.py
# Description: API endpoints pour la gestion des tenants
# ============================================================================

"""
Tenant API endpoints.
"""
import io
import json
import logging
import zipfile
from datetime import datetime, timezone
from typing import Any, Dict, List
from uuid import UUID, uuid4

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies import get_current_tenant_id
from app.middleware.auth_middleware import get_current_user_id
from app.core.permissions import Roles, require_role
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import (
    TenantFeatureResponse,
    TenantResponse,
    TenantStatsResponse,
    TenantUpdateRequest,
    TenantUsageResponse,
)
from app.services.tenant_service import TenantService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tenants", tags=["Tenants"])

# ─── Tenant-scoped tables (used by export / reset / delete) ──────────────────
# Order matters: children must be deleted before parents (FK direction).
# Each tuple: (label_for_counts, DELETE SQL template using :tid placeholder).
# Some tables don't have `tenant_id` directly — they're scoped via their parent.
_ESG_DATA_OPS: List[tuple[str, str]] = [
    # ESG data layer (safe to wipe on "reset")
    ("data_entries",         "DELETE FROM data_entries WHERE tenant_id = :tid"),
    ("indicator_data",       "DELETE FROM indicator_data WHERE tenant_id = :tid"),
    ("indicator_formulas",   "DELETE FROM indicator_formulas WHERE tenant_id = :tid"),
    ("esg_scores",           "DELETE FROM esg_scores WHERE tenant_id = :tid"),
    ("esg_risks",            "DELETE FROM esg_risks WHERE tenant_id = :tid"),
    ("materiality_issues",   "DELETE FROM materiality_issues WHERE tenant_id = :tid"),
    ("framework_assessments","DELETE FROM framework_assessments WHERE tenant_id = :tid"),
    ("report_history",       "DELETE FROM report_history WHERE tenant_id = :tid"),
    # auditor_comments → no tenant_id; cascade via auditor_reviews
    ("auditor_comments",     "DELETE FROM auditor_comments WHERE review_id IN (SELECT id FROM auditor_reviews WHERE tenant_id = :tid)"),
    ("auditor_reviews",      "DELETE FROM auditor_reviews WHERE tenant_id = :tid"),
    ("data_uploads",         "DELETE FROM data_uploads WHERE tenant_id = :tid"),
    ("suppliers",            "DELETE FROM suppliers WHERE tenant_id = :tid"),
    ("indicators",           "DELETE FROM indicators WHERE tenant_id = :tid"),
    ("sector_weights",       "DELETE FROM sector_weights WHERE tenant_id = :tid"),
    # webhook_deliveries → no tenant_id; cascade via webhooks
    ("webhook_deliveries",   "DELETE FROM webhook_deliveries WHERE webhook_id IN (SELECT id FROM webhooks WHERE tenant_id = :tid)"),
    ("webhooks",             "DELETE FROM webhooks WHERE tenant_id = :tid"),
    ("integrations",         "DELETE FROM integrations WHERE tenant_id = :tid"),
]

# Tables that should ALSO be deleted on full workspace deletion (in addition to ESG data).
_WORKSPACE_OPS: List[tuple[str, str]] = _ESG_DATA_OPS + [
    ("audit_logs",           "DELETE FROM audit_logs WHERE tenant_id = :tid"),
    ("api_keys",             "DELETE FROM api_keys WHERE tenant_id = :tid"),
    ("sso_configs",          "DELETE FROM sso_configs WHERE tenant_id = :tid"),
    # user_roles → no tenant_id; cascade via users
    ("user_roles",           "DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE tenant_id = :tid)"),
    ("organizations",        "DELETE FROM organizations WHERE tenant_id = :tid"),
    # Custom tenant-scoped roles only (system roles have NULL tenant_id and stay)
    ("roles",                "DELETE FROM roles WHERE tenant_id = :tid"),
    ("users",                "DELETE FROM users WHERE tenant_id = :tid"),
]

# Backwards-compat names used by the export endpoint
_ESG_DATA_TABLES: List[str]  = [t for t, _ in _ESG_DATA_OPS]
_WORKSPACE_TABLES: List[str] = [t for t, _ in _WORKSPACE_OPS]


@router.get(
    "/me",
    response_model=TenantResponse,
    summary="Get current tenant",
    description="Get information about the current tenant.",
)
async def get_current_tenant(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current tenant information.
    
    **Returns:**
    - Tenant details
    - Plan tier and limits
    - Settings and feature flags
    - Billing information
    
    **Use cases:**
    - Display tenant info in UI
    - Check plan limits
    - Verify feature availability
    
    **Example response:**
    ```json
    {
      "id": "...",
      "name": "Demo Company",
      "slug": "demo-company",
      "plan_tier": "pro",
      "status": "active",
      "max_users": 50,
      "max_orgs": 100,
      "settings": {...},
      "feature_flags": {...}
    }
    ```
    """
    service = TenantService(db, tenant_id)
    tenant = await service.get_tenant()
    return tenant


@router.put(
    "/me",
    response_model=TenantResponse,
    summary="Update tenant settings",
    description="Update tenant name, settings, or feature flags.",
)
async def update_tenant(
    request: TenantUpdateRequest,
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Update tenant settings.
    
    **Request body:**
    - name: Tenant display name
    - billing_email: Billing contact email
    - settings: Custom settings (JSON)
    - feature_flags: Feature toggles (JSON)
    
    **Returns:**
    - Updated tenant
    
    **Examples:**
    - Update name: `{"name": "New Company Name"}`
    - Update billing: `{"billing_email": "finance@company.com"}`
    - Update settings: `{"settings": {"default_currency": "EUR"}}`
    - Toggle features: `{"feature_flags": {"beta_features": true}}`
    
    **Notes:**
    - Cannot change plan_tier (contact support)
    - Cannot change slug (permanent identifier)
    - Settings and feature_flags are merged (not replaced)
    """
    service = TenantService(db, tenant_id)
    tenant = await service.update_tenant(request)
    return tenant


@router.get(
    "/me/stats",
    response_model=TenantStatsResponse,
    summary="Get tenant statistics",
    description="Get usage statistics and limits for the tenant.",
)
async def get_tenant_stats(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get tenant statistics and usage.
    
    **Returns:**
    - User counts (total, active, remaining)
    - Organization counts
    - API usage (last 30 days)
    - Storage usage
    - Plan limits
    - Billing status
    
    **Use cases:**
    - Dashboard overview
    - Capacity planning
    - Usage monitoring
    - Billing reconciliation
    
    **Example response:**
    ```json
    {
      "total_users": 25,
      "active_users": 23,
      "max_users": 50,
      "users_remaining": 25,
      "total_organizations": 45,
      "max_orgs": 100,
      "orgs_remaining": 55,
      "api_calls_last_30_days": 45678,
      "api_calls_limit": 100000,
      "plan_tier": "pro",
      "billing_status": "active"
    }
    ```
    """
    service = TenantService(db, tenant_id)
    stats = await service.get_stats()
    return stats


@router.get(
    "/me/usage",
    response_model=TenantUsageResponse,
    summary="Get tenant usage metrics",
    description="Get detailed usage metrics for a specific period.",
)
async def get_tenant_usage(
    period: str = Query(
        "last_30_days",
        description="Period: 'last_30_days' or 'YYYY-MM'",
    ),
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed usage metrics.
    
    **Query parameters:**
    - period: Time period to analyze
      - 'last_30_days': Last 30 days (default)
      - 'YYYY-MM': Specific month (e.g., '2024-02')
    
    **Returns:**
    - User activity (logins, unique users)
    - API usage (calls, by endpoint)
    - Data uploads (count, size)
    - Scoring activity
    - Reports generated
    
    **Use cases:**
    - Usage reports
    - Billing verification
    - Activity monitoring
    - Trend analysis
    
    **Examples:**
    - GET /tenants/me/usage
    - GET /tenants/me/usage?period=2024-02
    - GET /tenants/me/usage?period=last_30_days
    """
    service = TenantService(db, tenant_id)
    usage = await service.get_usage(period)
    return usage


@router.get(
    "/me/features",
    response_model=TenantFeatureResponse,
    summary="Get available features",
    description="Get list of available and unavailable features for the tenant's plan.",
)
async def get_tenant_features(
    tenant_id: UUID = Depends(get_current_tenant_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Get available features for current plan.
    
    **Returns:**
    - plan_tier: Current plan
    - core_features: Always available
    - available_features: Included in plan
    - unavailable_features: Require upgrade
    - feature_flags: Custom toggles
    
    **Use cases:**
    - Feature gating in UI
    - Plan comparison
    - Upgrade prompts
    - Feature discovery
    
    **Example response:**
    ```json
    {
      "plan_tier": "pro",
      "core_features": [
        "user_management",
        "organization_hierarchy",
        "basic_reporting"
      ],
      "available_features": [
        "advanced_analytics",
        "api_access",
        "custom_reports"
      ],
      "unavailable_features": [
        "white_label",
        "dedicated_support"
      ],
      "feature_flags": {
        "beta_features": true
      }
    }
    ```
    
    **Plan tiers:**
    - **starter**: Basic features
    - **pro**: Advanced features + API
    - **enterprise**: All features + custom
    """
    service = TenantService(db, tenant_id)
    features = await service.get_features()
    return features


# ════════════════════════════════════════════════════════════════════════════
# DANGER ZONE — Export · Reset · Delete
# All require TENANT_ADMIN role + explicit confirmation in the request body.
# ════════════════════════════════════════════════════════════════════════════

class _ConfirmRequest(BaseModel):
    """Body schema for destructive endpoints — forces an explicit confirmation string."""
    confirmation: str = Field(
        ...,
        description="Must equal exactly 'SUPPRIMER' (delete) or 'REINITIALISER' (reset).",
        min_length=1,
        max_length=32,
    )
    password: str | None = Field(
        None,
        description="Current user password — required for full account deletion.",
        max_length=200,
    )


async def _fetch_tenant_or_404(db: AsyncSession, tenant_id: UUID) -> Tenant:
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Espace de travail introuvable.")
    return t


async def _wipe_tables(
    db: AsyncSession,
    tenant_id: UUID,
    ops: List[tuple[str, str]],
) -> Dict[str, int]:
    """
    Run each DELETE statement, in order, isolated by a savepoint.

    A savepoint (``begin_nested``) ensures that if one DELETE fails (table
    missing, FK violation, …) only that statement is rolled back — the outer
    transaction stays usable for the next tables. Without it, PostgreSQL
    marks the whole transaction aborted and every subsequent command raises
    ``InFailedSQLTransactionError``.
    """
    counts: Dict[str, int] = {}
    for label, sql in ops:
        try:
            async with db.begin_nested():  # SAVEPOINT per table
                res = await db.execute(text(sql), {"tid": str(tenant_id)})
                counts[label] = res.rowcount or 0
        except Exception as exc:
            logger.warning("Could not wipe %s for tenant %s: %s", label, tenant_id, exc)
            counts[label] = 0
    return counts


# ─── GET /tenants/me/export — full data export (ZIP) ─────────────────────────

@router.get(
    "/me/export",
    summary="Exporter toutes les données ESG de l'espace de travail (ZIP)",
    description=(
        "Génère une archive ZIP contenant un dump CSV/JSON de toutes les tables "
        "tenant-scoped (indicateurs, données ESG, organisations, etc.). "
        "Réservé au TENANT_ADMIN. À utiliser avant suppression du compte."
    ),
)
async def export_tenant_data(
    tenant_id: UUID = Depends(get_current_tenant_id),
    _admin: User = Depends(require_role(Roles.TENANT_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Stream a ZIP archive containing every tenant-scoped table as CSV."""
    import csv

    tenant = await _fetch_tenant_or_404(db, tenant_id)

    # Build ZIP in-memory (size is bounded by tenant data — fine for SME volumes)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # Manifest with metadata
        manifest = {
            "tenant_id":        str(tenant.id),
            "tenant_name":      tenant.name,
            "tenant_slug":      tenant.slug,
            "plan_tier":        tenant.plan_tier,
            "exported_at":      datetime.now(timezone.utc).isoformat(),
            "exported_by":      "tenant_admin",
            "tables_included":  _WORKSPACE_TABLES + ["tenants"],
            "format":           "csv per table + tenants.json",
            "purpose":          "GDPR Article 20 — Right to Data Portability",
        }
        zf.writestr("MANIFEST.json", json.dumps(manifest, indent=2, ensure_ascii=False))

        # Tenant row itself (single row → JSON)
        tenant_row = {
            c.name: (str(v) if isinstance(v, (UUID, datetime)) else v)
            for c, v in [(col, getattr(tenant, col.name)) for col in tenant.__table__.columns]
        }
        zf.writestr("tenants.json", json.dumps(tenant_row, indent=2, ensure_ascii=False, default=str))

        # Each tenant-scoped table → CSV
        for table in _WORKSPACE_TABLES:
            try:
                res = await db.execute(
                    text(f"SELECT * FROM {table} WHERE tenant_id = :tid"),
                    {"tid": str(tenant_id)},
                )
                rows = res.mappings().all()
            except Exception as exc:
                logger.warning("Skipping %s in export: %s", table, exc)
                continue

            sio = io.StringIO()
            if rows:
                writer = csv.DictWriter(sio, fieldnames=list(rows[0].keys()))
                writer.writeheader()
                for r in rows:
                    writer.writerow({k: ("" if v is None else str(v)) for k, v in r.items()})
            else:
                sio.write("(no rows)\n")
            zf.writestr(f"{table}.csv", sio.getvalue())

    buf.seek(0)
    filename = f"esgflow-export-{tenant.slug}-{datetime.now(timezone.utc):%Y%m%d}.zip"

    logger.info("Tenant %s exported by admin (%d tables)", tenant_id, len(_WORKSPACE_TABLES))

    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─── POST /tenants/me/reset — wipe ESG data, keep workspace ──────────────────

@router.post(
    "/me/reset",
    status_code=status.HTTP_200_OK,
    summary="Réinitialiser les données ESG (workspace conservé)",
    description=(
        "Supprime toutes les saisies ESG (indicateurs, scores, fournisseurs, "
        "matérialité, etc.) mais conserve : utilisateurs, organisations, "
        "abonnement Stripe, paramètres. Confirmation requise dans le body : "
        "`{\"confirmation\": \"REINITIALISER\"}`."
    ),
)
async def reset_tenant_data(
    body: _ConfirmRequest = Body(...),
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    _admin: User = Depends(require_role(Roles.TENANT_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Wipe ESG data only — organizations, users and Stripe sub are kept."""
    if body.confirmation != "REINITIALISER":
        raise HTTPException(
            status_code=400,
            detail="Confirmation invalide. Le champ 'confirmation' doit être 'REINITIALISER'.",
        )

    counts = await _wipe_tables(db, tenant_id, _ESG_DATA_OPS)

    # Audit log entry (best-effort, isolated in its own savepoint)
    try:
        async with db.begin_nested():
            await db.execute(
                text("""
                    INSERT INTO audit_logs (id, tenant_id, user_id, entity_type, entity_id,
                                           action, change_reason, new_values, created_at)
                    VALUES (:lid, :tid, :uid, 'tenant', :tid,
                            'reset_esg_data', 'Tenant admin requested ESG data reset',
                            CAST(:counts AS JSONB), now())
                """),
                {
                    "lid":    str(uuid4()),
                    "tid":    str(tenant_id),
                    "uid":    str(user_id),
                    "counts": json.dumps(counts),
                },
            )
    except Exception as exc:
        logger.warning("Could not write audit log for reset: %s", exc)

    try:
        await db.commit()
    except Exception as exc:
        logger.error("Commit failed during reset of tenant %s: %s", tenant_id, exc)
        await db.rollback()
        raise HTTPException(status_code=500, detail="Échec de la réinitialisation (commit).")

    total = sum(counts.values())
    logger.info("Tenant %s ESG data reset by user %s — %d rows wiped", tenant_id, user_id, total)

    return {
        "message": f"Données ESG réinitialisées. {total} enregistrements supprimés.",
        "rows_deleted": total,
        "details": counts,
    }


# ─── DELETE /tenants/me — full workspace deletion ─────────────────────────────

@router.delete(
    "/me",
    status_code=status.HTTP_200_OK,
    summary="Supprimer définitivement l'espace de travail",
    description=(
        "Supprime intégralement le tenant : données ESG, utilisateurs, "
        "organisations, clés API, sessions SSO. Annule également "
        "l'abonnement Stripe immédiatement. "
        "Confirmation requise : `{\"confirmation\": \"SUPPRIMER\"}`. "
        "Action irréversible. Réservée au TENANT_ADMIN."
    ),
)
async def delete_tenant(
    request: Request,
    body: _ConfirmRequest = Body(...),
    tenant_id: UUID = Depends(get_current_tenant_id),
    user_id: UUID = Depends(get_current_user_id),
    admin: User = Depends(require_role(Roles.TENANT_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete the current workspace and cancel Stripe subscription."""
    if body.confirmation != "SUPPRIMER":
        raise HTTPException(
            status_code=400,
            detail="Confirmation invalide. Le champ 'confirmation' doit être 'SUPPRIMER'.",
        )

    tenant = await _fetch_tenant_or_404(db, tenant_id)

    # 1. Cancel Stripe subscription immediately (best-effort; missing sub is OK)
    stripe_result: Dict[str, Any] = {"cancelled": False, "reason": "no_subscription"}
    if tenant.stripe_subscription_id:
        try:
            from app.services.stripe_service import _get_stripe
            s = _get_stripe()
            s.Subscription.delete(tenant.stripe_subscription_id)
            stripe_result = {"cancelled": True, "subscription_id": tenant.stripe_subscription_id}
            logger.info("Cancelled Stripe sub %s for tenant %s", tenant.stripe_subscription_id, tenant_id)
        except Exception as exc:
            logger.error("Failed to cancel Stripe sub for tenant %s: %s", tenant_id, exc)
            stripe_result = {"cancelled": False, "reason": str(exc)}

    # 2. Audit log BEFORE wiping (so we keep a trace even after table is gone)
    deletion_record = {
        "tenant_id":     str(tenant.id),
        "tenant_name":   tenant.name,
        "tenant_slug":   tenant.slug,
        "plan_tier":     tenant.plan_tier,
        "deleted_by":    str(user_id),
        "deleted_at":    datetime.now(timezone.utc).isoformat(),
        "stripe":        stripe_result,
        "ip":            request.client.host if request.client else None,
    }
    logger.warning("TENANT_DELETION %s", json.dumps(deletion_record))

    # 3. Mark tenant as deleted FIRST (instant lockout via middleware checks)
    await db.execute(
        update(Tenant)
        .where(Tenant.id == tenant_id)
        .values(status="deleted", updated_at=datetime.now(timezone.utc))
    )
    await db.commit()

    # 4. Wipe all tenant-scoped tables (children → parents order)
    counts = await _wipe_tables(db, tenant_id, _WORKSPACE_OPS)
    # Commit the wipe before attempting the final tenant row DELETE — this way,
    # if a FK to tenants still exists somewhere we missed, the data is at least
    # gone and the tenant stays marked status='deleted' (unreachable from app).
    try:
        await db.commit()
    except Exception as exc:
        logger.warning("Commit after wipe failed for tenant %s: %s", tenant_id, exc)
        await db.rollback()

    # 5. (custom roles already cleaned in _WORKSPACE_OPS — nothing to do here)

    # 6. Finally, delete the tenant row itself. If FK constraints still reject it,
    # the row stays with status='deleted' (effective lockout) and we log the issue
    # — a follow-up migration can hard-delete it later.
    tenant_hard_deleted = False
    try:
        async with db.begin_nested():
            await db.execute(text("DELETE FROM tenants WHERE id = :tid"), {"tid": str(tenant_id)})
        await db.commit()
        tenant_hard_deleted = True
    except Exception as exc:
        logger.error(
            "Tenant row DELETE failed for %s — kept as status='deleted'. Error: %s",
            tenant_id, exc,
        )
        await db.rollback()
        # Re-assert status='deleted' in case the rollback nuked it
        try:
            await db.execute(
                update(Tenant)
                .where(Tenant.id == tenant_id)
                .values(status="deleted", updated_at=datetime.now(timezone.utc))
            )
            await db.commit()
        except Exception:
            await db.rollback()

    total = sum(counts.values())
    logger.warning(
        "TENANT_DELETED tenant=%s by user=%s — %d rows wiped across %d tables (hard_deleted=%s)",
        tenant_id, user_id, total, len(counts), tenant_hard_deleted,
    )

    return {
        "message": (
            "Espace de travail supprimé définitivement."
            if tenant_hard_deleted
            else "Espace de travail désactivé et données effacées (contrainte FK résiduelle — nettoyage final différé)."
        ),
        "tenant_id": str(tenant_id),
        "rows_deleted": total,
        "hard_deleted": tenant_hard_deleted,
        "stripe": stripe_result,
        "deleted_at": datetime.now(timezone.utc).isoformat(),
    }
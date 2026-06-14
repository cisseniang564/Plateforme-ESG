"""ESGFlow Backend - Main FastAPI Application"""
import logging
from contextlib import asynccontextmanager

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.asyncio import AsyncioIntegration

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import register_exception_handlers
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.api.v1 import auth, organizations, tasks, tenants
from app.api.v1.endpoints import indicators
from app.api.v1.endpoints import reports
from app.api.v1.endpoints import calculations
from app.api.v1.endpoints import analytics
from app.api.v1.endpoints import data_upload
from app.api.v1.endpoints import indicator_data
from app.api.v1.endpoints import user_management
from app.api.v1.endpoints import webhooks
from app.api.v1.endpoints import integrations
from app.api.v1.endpoints import insee
from app.api.v1.endpoints import esg_enrichment
from app.api.v1.endpoints import esg_scoring
from app.api.v1.endpoints import materiality
from app.api.v1.endpoints import data_entry
from app.api.v1.endpoints import data_validation
from app.api.v1.endpoints import esg_import
from app.config import settings
from app.db.session import close_db, init_db, AsyncSessionLocal
from app.middleware.auth_middleware import AuthMiddleware
from app.middleware.billing_middleware import BillingMiddleware
from app.middleware.rate_limit_middleware import RateLimitMiddleware
from app.middleware.prometheus_middleware import PrometheusMiddleware
from app.middleware.csrf_middleware import CSRFMiddleware
from app.core.logging_config import configure_logging
from app.api.v1.endpoints import admin_users
from app.api.v1.endpoints import register
from app.api.v1.endpoints import onboarding
from app.api.v1.endpoints import validation_workflow
from app.api.v1.endpoints import taxonomy
from app.api.v1.endpoints import benchmarks
from app.api.v1.endpoints import schneider
from app.api.v1.endpoints import enedis
from app.api.v1.endpoints import sage_cegid
from app.api.v1.endpoints import connectors
from app.api.v1.endpoints import billing
from app.api.v1.endpoints import scores
from app.api.v1.endpoints import stripe_webhook
from app.api.v1.endpoints import gdpr
from app.api.v1.endpoints import company_indicators
from app.api.v1.endpoints import notifications
from app.api.v1.endpoints import auditor_reviews
from app.api.v1.endpoints import stakeholder_surveys
from app.api.v1.endpoints import sbti
from app.api.v1.endpoints import lca
from app.api.v1.endpoints import commute_emissions
from app.api.v1.endpoints import connector_catalog
from app.api.v1.endpoints import scope3
from app.api.v1.endpoints import email_verification
from app.api.v1.endpoints import audit_trail
from app.api.v1.endpoints import api_usage
from app.api.v1.endpoints import carbon
from app.api.v1.endpoints import supply_chain
from app.api.v1.endpoints import esrs
from app.api.v1.endpoints import ai_insights
from app.api.v1.endpoints import smart_alerts
from app.api.v1.endpoints import api_keys
from app.api.v1.endpoints import sso
from app.api.v1.endpoints import hr_import
from app.api.v1.endpoints import cabinet
from app.api.v1.endpoints import sector_templates
from app.api.v1.endpoints import import_templates
from app.api.v1.endpoints import pennylane
from app.api.v1.endpoints import qonto
from app.middleware.api_usage_middleware import ApiUsageMiddleware

logger = logging.getLogger(__name__)

# ── SENTRY & LOGGING INIT ────────────────────────────────────────────────────
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration(), SqlalchemyIntegration(), AsyncioIntegration()],
        traces_sample_rate=getattr(settings, 'SENTRY_TRACES_SAMPLE_RATE', 0.1),
        environment=getattr(settings, 'APP_ENV', 'production'),
        release=getattr(settings, 'APP_VERSION', '0.1.0'),
    )

configure_logging(
    log_level=getattr(settings, 'LOG_LEVEL', 'INFO'),
    json_logs=getattr(settings, 'APP_ENV', 'development') == 'production'
)


async def _ensure_system_roles_and_assignments() -> None:
    """
    Idempotent startup migration:
    1. Seed the 5 system roles if they don't yet exist.
    2. Assign tenant_admin to every user that still has role_id = NULL.
    3. Upgrade trialing tenants from 'starter' to 'pro' plan_tier.
    4. Backfill trial_ends_at (14 days from created_at) for tenants missing it.
    """
    from sqlalchemy import text
    try:
        async with AsyncSessionLocal() as db:
            # 1. Seed system roles (safe: name uniqueness checked with WHERE NOT EXISTS)
            system_roles = [
                ("tenant_admin",  "Administrateur tenant — accès complet"),
                ("esg_admin",     "Administrateur ESG"),
                ("esg_manager",   "Gestionnaire ESG"),
                ("data_entry",    "Saisie de données"),
                ("viewer",        "Lecteur"),
            ]
            for role_name, role_desc in system_roles:
                # SELECT first, then INSERT — avoids asyncpg AmbiguousParameterError
                # that occurs when the same :name param is used in both INSERT target
                # and WHERE NOT EXISTS subquery (PostgreSQL can't infer the type).
                existing = await db.execute(
                    text("SELECT 1 FROM roles WHERE name = :name AND is_system_role = true LIMIT 1"),
                    {"name": role_name},
                )
                if existing.fetchone() is None:
                    await db.execute(
                        text("""
                            INSERT INTO roles (id, name, description, is_system_role, created_at, updated_at)
                            VALUES (gen_random_uuid(), :name, :desc, true, now(), now())
                        """),
                        {"name": role_name, "desc": role_desc},
                    )

            # 2. Assign tenant_admin to users with NULL role_id
            result = await db.execute(
                text("""
                    UPDATE users
                    SET role_id = (
                        SELECT id FROM roles
                        WHERE name = 'tenant_admin' AND is_system_role = true
                        LIMIT 1
                    )
                    WHERE role_id IS NULL
                """)
            )
            updated_users = result.rowcount
            if updated_users:
                logger.info("Startup migration: assigned tenant_admin role to %d user(s).", updated_users)

            # 3. Upgrade trialing tenants' plan_tier to 'pro'
            result2 = await db.execute(
                text("""
                    UPDATE tenants
                    SET plan_tier = 'pro',
                        max_users = GREATEST(max_users, 50),
                        max_orgs  = GREATEST(max_orgs,  100),
                        max_monthly_api_calls = GREATEST(max_monthly_api_calls, 100000),
                        data_retention_months = GREATEST(data_retention_months, 36)
                    WHERE stripe_subscription_status = 'trialing'
                      AND plan_tier NOT IN ('pro', 'enterprise')
                """)
            )
            if result2.rowcount:
                logger.info(
                    "Startup migration: upgraded %d trialing tenant(s) to pro plan_tier.",
                    result2.rowcount,
                )

            # 4. Backfill trial_ends_at for tenants that have none (14 days from created_at)
            #    This covers accounts created before the trial system was introduced.
            result3 = await db.execute(
                text("""
                    UPDATE tenants
                    SET trial_ends_at = created_at + INTERVAL '14 days',
                        stripe_subscription_status = COALESCE(stripe_subscription_status, 'trialing')
                    WHERE trial_ends_at IS NULL
                      AND plan_tier NOT IN ('enterprise')
                """)
            )
            if result3.rowcount:
                logger.info(
                    "Startup migration: backfilled trial_ends_at (14 days) for %d tenant(s).",
                    result3.rowcount,
                )

            # 5. Auto-downgrade tenants whose trial expired >24h ago and have no
            #    active paid subscription. Sets status='expired' and resets limits
            #    to the free plan. Idempotent: re-running has no effect.
            result4 = await db.execute(
                text("""
                    UPDATE tenants
                    SET plan_tier = 'free',
                        stripe_subscription_status = 'expired',
                        max_users = 3,
                        max_orgs = 5,
                        max_monthly_api_calls = 1000,
                        data_retention_months = 12
                    WHERE trial_ends_at IS NOT NULL
                      AND trial_ends_at < NOW() - INTERVAL '24 hours'
                      AND (stripe_subscription_status IS NULL
                           OR stripe_subscription_status NOT IN ('active', 'past_due', 'expired'))
                      AND plan_tier != 'enterprise'
                """)
            )
            if result4.rowcount:
                logger.info(
                    "Startup migration: downgraded %d tenant(s) with expired trials to free plan.",
                    result4.rowcount,
                )

            await db.commit()
    except Exception as exc:
        logger.warning("Startup role migration failed (non-blocking): %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # init_db runs idempotent incremental DDL (CREATE TABLE IF NOT EXISTS, etc.)
    # in ALL environments. create_all() is still dev/test-only inside init_db.
    await init_db()

    # Seed roles + assign tenant_admin + fix trialing plan_tier (idempotent)
    await _ensure_system_roles_and_assignments()

    logger.info(
        "ESGFlow Platform started | env=%s debug=%s host=%s:%s",
        settings.APP_ENV,
        settings.APP_DEBUG,
        settings.APP_HOST,
        settings.APP_PORT,
    )

    yield

    await close_db()
    logger.info("ESGFlow Platform stopped.")


app = FastAPI(
    title=settings.APP_NAME,
    description="ESGFlow Platform — SaaS ESG Data Management & Scoring",
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.API_DOCS_ENABLED else None,
    redoc_url="/redoc" if settings.API_DOCS_ENABLED else None,
    lifespan=lifespan,
    redirect_slashes=False,
)

# ── MIDDLEWARES ──────────────────────────────────────────────────────────────
# IMPORTANT: Starlette exécute les middlewares en ordre LIFO
# (le dernier ajouté est le premier exécuté).
# Ordre d'exécution voulu : SecurityHeaders → CORS → Auth → RateLimit → ApiUsage

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)
app.add_middleware(RateLimitMiddleware, redis_url=str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0")
app.add_middleware(ApiUsageMiddleware, redis_url=str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0")
app.add_middleware(BillingMiddleware)   # must run AFTER AuthMiddleware sets request.state.tenant_id
app.add_middleware(AuthMiddleware)
# CSRF: reject mutating cookie-auth requests whose Origin isn't in CORS_ORIGINS.
# Bearer-token requests and webhook signatures are exempted inside the middleware.
app.add_middleware(CSRFMiddleware, allowed_origins=list(settings.CORS_ORIGINS))
# Security headers en dernier → s'exécute en premier (LIFO)
app.add_middleware(SecurityHeadersMiddleware, environment=settings.APP_ENV)
# Prometheus metrics — outermost so it captures all requests
app.add_middleware(PrometheusMiddleware)

# ── HTTPS / proxy hardening (production only) ────────────────────────────────
# Order matters: ProxyHeaders must run BEFORE HTTPSRedirect so that
# request.url.scheme reflects X-Forwarded-Proto from the reverse proxy
# (nginx/Cloudflare), otherwise the redirect would loop forever.
if settings.is_production:
    app.add_middleware(HTTPSRedirectMiddleware)
    # Restrict Host header to known domains to prevent Host-header injection
    _allowed_hosts = getattr(settings, "ALLOWED_HOSTS", None) or ["*"]
    if _allowed_hosts != ["*"]:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts)
    # Trust X-Forwarded-* headers from the reverse proxy
    app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# ── EXCEPTION HANDLERS ───────────────────────────────────────────────────────
register_exception_handlers(app, cors_origins=list(settings.CORS_ORIGINS))


# ── HEALTH CHECKS ────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/health/live", tags=["System"])
async def liveness():
    """Kubernetes liveness probe — always returns 200 if app is running."""
    return {"status": "alive", "version": getattr(settings, 'APP_VERSION', '0.1.0')}


@app.get("/health/ready", tags=["System"])
async def readiness():
    """Kubernetes readiness probe — checks DB and Redis connectivity."""
    import asyncio
    from sqlalchemy import text
    checks = {}

    # DB check
    try:
        async with AsyncSessionLocal() as session:
            await asyncio.wait_for(session.execute(text("SELECT 1")), timeout=2.0)
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)}"

    # Redis check (optional)
    try:
        import redis.asyncio as aioredis
        r = aioredis.from_url(str(settings.REDIS_URL) if settings.REDIS_URL else "redis://redis:6379/0", socket_connect_timeout=2)
        await asyncio.wait_for(r.ping(), timeout=2.0)
        await r.aclose()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"unavailable: {str(e)}"

    all_ok = checks.get("database") == "ok"
    status_code = 200 if all_ok else 503

    return JSONResponse(
        content={"status": "ready" if all_ok else "degraded", "checks": checks},
        status_code=status_code
    )


# ── METRICS ───────────────────────────────────────────────────────────────────

@app.get("/metrics", include_in_schema=False)
async def metrics():
    """Prometheus metrics endpoint."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/", tags=["System"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs" if settings.API_DOCS_ENABLED else None,
    }


# ROUTERS
app.include_router(tenants.router, prefix="/api/v1")
app.include_router(organizations.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")

# gdpr.router (DELETE/GET /me*) must be registered before user_management.router
# so its specific "/me" path isn't shadowed by user_management's "/{target_user_id}".
app.include_router(gdpr.router, prefix="/api/v1/users", tags=["GDPR"])
app.include_router(user_management.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(indicator_data.router, prefix="/api/v1/indicator-data", tags=["Indicator Data"])
app.include_router(data_upload.router, prefix="/api/v1/data", tags=["Data Upload"])
app.include_router(indicators.router, prefix="/api/v1/indicators", tags=["Indicators"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(calculations.router, prefix="/api/v1/calculations", tags=["Calculations"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(webhooks.router, prefix="/api/v1/webhooks", tags=["Webhooks"])
app.include_router(integrations.router, prefix="/api/v1/integrations", tags=["Integrations"])
app.include_router(insee.router, prefix="/api/v1/insee", tags=["INSEE"])
app.include_router(esg_enrichment.router, prefix="/api/v1/esg-enrichment", tags=["ESG Enrichment"])
app.include_router(esg_scoring.router, prefix="/api/v1/esg-scoring", tags=["ESG Scoring"])
app.include_router(materiality.router, prefix="/api/v1/materiality", tags=["Materiality"])
app.include_router(data_entry.router, prefix="/api/v1/data-entry", tags=["Data Entry"])
app.include_router(data_validation.router, prefix="/api/v1/data-validation", tags=["Data Validation"])
app.include_router(esg_import.router, prefix="/api/v1/esg-import", tags=["ESG Import"])
app.include_router(auth.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(admin_users.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(register.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(onboarding.router, prefix="/api/v1")
app.include_router(validation_workflow.router, prefix="/api/v1", tags=["Validation Workflow"])
app.include_router(taxonomy.router, prefix="/api/v1", tags=["Taxonomy"])
from app.api.v1.endpoints import cdp
app.include_router(cdp.router, prefix="/api/v1", tags=["CDP"])
from app.api.v1.endpoints import csddd
app.include_router(csddd.router, prefix="/api/v1", tags=["CSDDD"])
from app.api.v1.endpoints import framework_data
app.include_router(framework_data.router, prefix="/api/v1", tags=["Framework Data"])
app.include_router(benchmarks.router, prefix="/api/v1", tags=["Benchmarking"])
app.include_router(audit_trail.router, prefix="/api/v1", tags=["Audit Trail"])
app.include_router(schneider.router, prefix="/api/v1/connectors/schneider", tags=["Schneider-Climatiq"])
app.include_router(sage_cegid.router, prefix="/api/v1/connectors/sage-cegid", tags=["Sage-Cegid FEC"])
app.include_router(enedis.router, prefix="/api/v1")
app.include_router(connectors.router, prefix="/api/v1/connectors", tags=["Connectors"])
app.include_router(billing.router, prefix="/api/v1/billing", tags=["Billing"])
app.include_router(scores.router, prefix="/api/v1/scores", tags=["Scores"])
app.include_router(stripe_webhook.router, prefix="/api/v1/webhooks", tags=["Stripe Webhook"])
app.include_router(company_indicators.router, prefix="/api/v1", tags=["Company Indicators"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])

# Vigilance module (Loi 2017-399 + Sapin 2)
from app.api.v1.endpoints import vigilance as _vigilance
app.include_router(_vigilance.router, prefix="/api/v1")
app.include_router(_vigilance.public_router, prefix="/api/v1")

# Sectoral templates (1-click data pre-fill per sector)
from app.api.v1.endpoints import templates as _templates
app.include_router(_templates.router, prefix="/api/v1")

# Public platform status page (no auth — listed in PUBLIC_PATHS)
from app.api.v1.endpoints import status as _status
app.include_router(_status.router, prefix="/api/v1", tags=["System"])

# FEC Wizard (3-click Scope 3 from accounting file)
from app.api.v1.endpoints import fec_wizard as _fec_wizard
app.include_router(_fec_wizard.router, prefix="/api/v1")

# P5 Persistance — SFDR (localStorage → DB) + Taxonomy (Redis → DB)
from app.api.v1.endpoints import sfdr as _sfdr
app.include_router(_sfdr.router, prefix="/api/v1")

from app.api.v1.endpoints import taxonomy_assessment as _taxonomy_assess
app.include_router(_taxonomy_assess.router, prefix="/api/v1")
app.include_router(auditor_reviews.router, prefix="/api/v1/auditor-reviews", tags=["Auditor Reviews"])
app.include_router(stakeholder_surveys.router, prefix="/api/v1/stakeholder-surveys", tags=["Stakeholder Surveys"])
app.include_router(sbti.router, prefix="/api/v1/sbti", tags=["SBTi"])
app.include_router(lca.router, prefix="/api/v1/lca", tags=["LCA"])
app.include_router(commute_emissions.router, prefix="/api/v1/commute-emissions", tags=["Commute Emissions"])
app.include_router(connector_catalog.router, prefix="/api/v1/connector-marketplace", tags=["Connector Marketplace"])
app.include_router(scope3.router, prefix="/api/v1/scope3", tags=["Scope 3 Calculator"])
app.include_router(email_verification.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(api_usage.router, prefix="/api/v1", tags=["API Usage"])
app.include_router(carbon.router, prefix="/api/v1/carbon", tags=["Carbon"])
app.include_router(supply_chain.router, prefix="/api/v1/supply-chain", tags=["Supply Chain"])
app.include_router(esrs.router, prefix="/api/v1/esrs", tags=["ESRS"])
app.include_router(ai_insights.router, prefix="/api/v1/ai-insights", tags=["AI Insights"])
app.include_router(smart_alerts.router, prefix="/api/v1/smart-alerts", tags=["Smart Alerts"])
app.include_router(api_keys.router, prefix="/api/v1")
app.include_router(sso.router, prefix="/api/v1")
app.include_router(hr_import.router,         prefix="/api/v1/hr-import",         tags=["HR Import"])
app.include_router(cabinet.router,           prefix="/api/v1/cabinet",           tags=["Cabinet"])
app.include_router(sector_templates.router,  prefix="/api/v1",                   tags=["Sector Templates"])
app.include_router(import_templates.router,  prefix="/api/v1",                   tags=["Import Templates"])
app.include_router(pennylane.router,         prefix="/api/v1/connectors/pennylane", tags=["Connectors"])
app.include_router(qonto.router,             prefix="/api/v1/connectors/qonto",     tags=["Connectors"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower(),
    )

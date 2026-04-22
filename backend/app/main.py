"""ESGFlow Backend - Main FastAPI Application"""
import logging
from contextlib import asynccontextmanager

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.asyncio import AsyncioIntegration

from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
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
from app.api.v1.endpoints import users
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    if settings.is_development:
        await init_db()

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
# Security headers en dernier → s'exécute en premier (LIFO)
app.add_middleware(SecurityHeadersMiddleware, environment=settings.APP_ENV)
# Prometheus metrics — outermost so it captures all requests
app.add_middleware(PrometheusMiddleware)

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
app.include_router(benchmarks.router, prefix="/api/v1", tags=["Benchmarking"])
app.include_router(audit_trail.router, prefix="/api/v1", tags=["Audit Trail"])
app.include_router(schneider.router, prefix="/api/v1/connectors/schneider", tags=["Schneider-Climatiq"])
app.include_router(sage_cegid.router, prefix="/api/v1/connectors/sage-cegid", tags=["Sage-Cegid FEC"])
app.include_router(enedis.router, prefix="/api/v1")
app.include_router(connectors.router, prefix="/api/v1/connectors", tags=["Connectors"])
app.include_router(billing.router, prefix="/api/v1/billing", tags=["Billing"])
app.include_router(scores.router, prefix="/api/v1/scores", tags=["Scores"])
app.include_router(stripe_webhook.router, prefix="/api/v1/webhooks", tags=["Stripe Webhook"])
app.include_router(gdpr.router, prefix="/api/v1/users", tags=["GDPR"])
app.include_router(company_indicators.router, prefix="/api/v1", tags=["Company Indicators"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(email_verification.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(api_usage.router, prefix="/api/v1", tags=["API Usage"])
app.include_router(carbon.router, prefix="/api/v1/carbon", tags=["Carbon"])
app.include_router(supply_chain.router, prefix="/api/v1/supply-chain", tags=["Supply Chain"])
app.include_router(esrs.router, prefix="/api/v1/esrs", tags=["ESRS"])
app.include_router(ai_insights.router, prefix="/api/v1/ai-insights", tags=["AI Insights"])
app.include_router(smart_alerts.router, prefix="/api/v1/smart-alerts", tags=["Smart Alerts"])
app.include_router(api_keys.router, prefix="/api/v1")
app.include_router(sso.router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower(),
    )

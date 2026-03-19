"""ESGFlow Backend - Main FastAPI Application"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
from app.db.session import close_db, init_db
from app.middleware.auth_middleware import AuthMiddleware
from app.api.v1.endpoints import admin_users
from app.api.v1.endpoints import register
from app.api.v1.endpoints import onboarding
from app.api.v1.endpoints import validation_workflow
from app.api.v1.endpoints import taxonomy
from app.api.v1.endpoints import benchmarks

logger = logging.getLogger(__name__)


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
)

# MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

app.add_middleware(AuthMiddleware)


# EXCEPTION HANDLERS
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    cors_headers: dict[str, str] = {}
    if origin and origin in settings.CORS_ORIGINS:
        cors_headers["Access-Control-Allow-Origin"] = origin
        cors_headers["Access-Control-Allow-Credentials"] = "true"

    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    
    if settings.APP_DEBUG:
        return JSONResponse(
            status_code=500,
            headers=cors_headers,
            content={"error": "Internal server error", "detail": str(exc)},
        )

    return JSONResponse(
        status_code=500,
        headers=cors_headers,
        content={"error": "Internal server error"},
    )


# HEALTH CHECK
@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/", tags=["System"])
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs" if settings.API_DOCS_ENABLED else None,
    }


# ROUTERS
app.include_router(auth.router, prefix="/api/v1")
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
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(admin_users.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(register.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(onboarding.router, prefix="/api/v1")
app.include_router(validation_workflow.router, prefix="/api/v1")
app.include_router(taxonomy.router, prefix="/api/v1")
app.include_router(benchmarks.router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower(),
    )




# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "esgflow-backend",
        "version": "1.0.0"
    }

"""
Shared pytest fixtures for ESGFlow backend tests.
"""
import asyncio
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

# ── Set minimal env vars before any app import ────────────────────────────────
os.environ.setdefault("APP_NAME", "ESGFlow Test")
# APP_ENV must match the pattern ^(development|staging|production)$
os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("APP_DEBUG", "true")
# SECRET_KEY / ENCRYPTION_KEY must be at least 32 chars
os.environ.setdefault("APP_SECRET_KEY", "test-secret-key-32-chars-minimum!!")
os.environ.setdefault("SECRET_KEY", "test-secret-key-32-chars-minimum!!")
os.environ.setdefault("ENCRYPTION_KEY", "test-encryption-key-32-chars-min!!")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("DATABASE_PASSWORD", "test-db-password")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-at-least-32-chars!!")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7")
os.environ.setdefault("CORS_ORIGINS", '["http://localhost:3000"]')
os.environ.setdefault("SMTP_USER", "test@test.com")
os.environ.setdefault("SMTP_PASSWORD", "test")
os.environ.setdefault("SMTP_FROM_EMAIL", "noreply@test.com")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("SENTRY_DSN", "")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_placeholder")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_placeholder")
os.environ.setdefault("RESEND_API_KEY", "re_placeholder")
# S3 credentials — required fields in Settings
os.environ.setdefault("S3_ACCESS_KEY_ID", "test-s3-access-key-id")
os.environ.setdefault("S3_SECRET_ACCESS_KEY", "test-s3-secret-access-key")


# ── Common UUIDs ───────────────────────────────────────────────────────────────
TENANT_ID = uuid4()
ORG_ID = uuid4()
USER_ID = uuid4()


@pytest.fixture
def tenant_id():
    return TENANT_ID


@pytest.fixture
def org_id():
    return ORG_ID


@pytest.fixture
def user_id():
    return USER_ID


@pytest.fixture
def mock_db():
    """Async SQLAlchemy session mock."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    return session


@pytest.fixture
def sample_data_points():
    """Realistic data points list (mimics DB rows: pillar, category, code, name, unit, value, date, is_verified)."""
    return [
        # Environmental — Émissions (weight 0.30)
        ("environmental", "Émissions", "E001", "CO2 Scope 1", "tCO2eq", 75.0, "2024-01-01", True),
        ("environmental", "Émissions", "E002", "CO2 Scope 2", "tCO2eq", 80.0, "2024-01-01", True),
        # Environmental — Énergie (weight 0.25)
        ("environmental", "Énergie", "E003", "Consommation électrique", "MWh", 65.0, "2024-01-01", False),
        # Social — Emploi (weight 0.25)
        ("social", "Emploi", "S001", "Taux de rétention", "%", 85.0, "2024-01-01", True),
        ("social", "Emploi", "S002", "Emplois créés", "n", 70.0, "2024-01-01", True),
        # Social — Diversité (weight 0.25)
        ("social", "Diversité", "S003", "Femmes cadres", "%", 45.0, "2024-01-01", True),
        # Gouvernance — Gouvernance (weight 0.40)
        ("governance", "Gouvernance", "G001", "Indépendance CA", "%", 90.0, "2024-01-01", True),
        ("governance", "Gouvernance", "G002", "Réunions CA", "n", 80.0, "2024-01-01", True),
        # Gouvernance — Éthique (weight 0.40)
        ("governance", "Éthique", "G003", "Code éthique formalisé", "bool", 100.0, "2024-01-01", True),
    ]


# ── Per-test UUID fixtures (generate fresh UUIDs per test) ─────────────────────

@pytest.fixture
def test_tenant_id():
    """Fresh UUID per test — use instead of global TENANT_ID when isolation is required."""
    return uuid4()


@pytest.fixture
def test_user_id():
    """Fresh UUID per test."""
    return uuid4()


@pytest.fixture
def test_org_id():
    """Fresh UUID per test."""
    return uuid4()


# ── JWT helpers ────────────────────────────────────────────────────────────────

@pytest.fixture
def valid_jwt_token(test_user_id, test_tenant_id):
    """Generate a valid JWT access token for test authentication."""
    from jose import jwt as _jwt
    secret = os.environ["JWT_SECRET_KEY"]
    payload = {
        "sub": str(test_user_id),
        "tenant_id": str(test_tenant_id),
        "exp": 9_999_999_999,  # far-future expiry
        "type": "access",
    }
    return _jwt.encode(payload, secret, algorithm="HS256")


@pytest.fixture
def auth_headers(valid_jwt_token):
    """Authorization header dict ready to be passed to httpx/TestClient."""
    return {"Authorization": f"Bearer {valid_jwt_token}"}


# ── FastAPI async test client ──────────────────────────────────────────────────

@pytest.fixture
async def async_client(mock_db):
    """
    Async HTTPX client connected to the FastAPI app.
    DB dependency is overridden with mock_db so no real Postgres is needed.
    """
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    from app.dependencies import get_db

    async def _override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()

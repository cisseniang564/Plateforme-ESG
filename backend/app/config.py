"""
ESGFlow Backend - Configuration
"""
from functools import lru_cache
from typing import Any, Dict, List, Optional

from pydantic import Field, PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )

    # ========================================================================
    # APPLICATION
    # ========================================================================
    APP_NAME: str = "ESGFlow"
    APP_ENV: str = Field(default="development", pattern="^(development|staging|production)$")
    APP_DEBUG: bool = True
    APP_VERSION: str = "0.1.0"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # ========================================================================
    # SECURITY
    # ========================================================================
    SECRET_KEY: str = Field(min_length=32)
    JWT_SECRET_KEY: str = Field(min_length=32)
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ENCRYPTION_KEY: str = Field(min_length=32)

    # ========================================================================
    # DATABASE - PostgreSQL
    # ========================================================================
    DATABASE_HOST: str = "localhost"
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "esgflow_dev"
    DATABASE_USER: str = "esgflow_user"
    DATABASE_PASSWORD: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_TIMEOUT: int = 30
    DATABASE_POOL_RECYCLE: int = 3600
    DATABASE_URL: Optional[PostgresDsn] = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        """Construct DATABASE_URL from components if not provided."""
        if isinstance(v, str):
            return v
        
        # Get values from info.data instead of values dict
        data = values.data if hasattr(values, 'data') else {}
        
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=data.get("DATABASE_USER"),
            password=data.get("DATABASE_PASSWORD"),
            host=data.get("DATABASE_HOST"),
            port=data.get("DATABASE_PORT"),
            path=f"{data.get('DATABASE_NAME') or ''}",
        )

    DATABASE_READ_REPLICA_URLS: List[str] = Field(default_factory=list)

    # ========================================================================
    # REDIS
    # ========================================================================
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URL: Optional[RedisDsn] = None

    @field_validator("REDIS_URL", mode="before")
    @classmethod
    def assemble_redis_connection(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        """Construct REDIS_URL from components if not provided."""
        if isinstance(v, str):
            return v
        
        data = values.data if hasattr(values, 'data') else {}
        host = data.get("REDIS_HOST", "localhost")
        port = data.get("REDIS_PORT", 6379)
        db = data.get("REDIS_DB", 0)
        password = data.get("REDIS_PASSWORD")
        
        if password:
            return f"redis://:{password}@{host}:{port}/{db}"
        return f"redis://{host}:{port}/{db}"

    # ========================================================================
    # CELERY
    # ========================================================================
    CELERY_REDIS_DB: int = 1
    CELERY_REDIS_URL: Optional[str] = None
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None

    # ========================================================================
    # KAFKA
    # ========================================================================
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_SECURITY_PROTOCOL: str = "PLAINTEXT"
    KAFKA_SASL_MECHANISM: Optional[str] = None
    KAFKA_SASL_USERNAME: Optional[str] = None
    KAFKA_SASL_PASSWORD: Optional[str] = None

    # Kafka topics
    KAFKA_TOPIC_DATA_UPLOADED: str = "data.uploaded"
    KAFKA_TOPIC_DATA_VALIDATED: str = "data.validated"
    KAFKA_TOPIC_DATA_NORMALIZED: str = "data.normalized"
    KAFKA_TOPIC_SCORE_CALCULATED: str = "score.calculated"
    KAFKA_TOPIC_REPORT_GENERATED: str = "report.generated"
    KAFKA_TOPIC_AUDIT_EVENT: str = "audit.event"

    # ========================================================================
    # S3 / OBJECT STORAGE
    # ========================================================================
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY_ID: str
    S3_SECRET_ACCESS_KEY: str
    S3_REGION: str = "eu-west-1"
    S3_BUCKET_NAME: str = "esgflow-data"
    S3_USE_SSL: bool = True

    # ========================================================================
    # BIGQUERY
    # ========================================================================
    BIGQUERY_PROJECT_ID: Optional[str] = None
    BIGQUERY_DATASET: str = "esgflow_warehouse"
    BIGQUERY_CREDENTIALS_PATH: Optional[str] = None

    # ========================================================================
    # AUTHENTICATION
    # ========================================================================
    AUTH0_DOMAIN: Optional[str] = None
    AUTH0_CLIENT_ID: Optional[str] = None
    AUTH0_CLIENT_SECRET: Optional[str] = None
    AUTH0_AUDIENCE: Optional[str] = None

    # ========================================================================
    # EMAIL / SMTP (legacy — kept for backward compat)
    # ========================================================================
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@esgflow.io"
    SMTP_FROM_NAME: str = "ESGFlow Platform"
    SMTP_USE_TLS: bool = True

    # ========================================================================
    # RESEND — transactional email
    # ========================================================================
    RESEND_API_KEY: str = "re_REPLACE_ME"
    RESEND_FROM_EMAIL: str = "noreply@esgflow.io"
    RESEND_FROM_NAME: str = "ESGFlow Platform"

    # ========================================================================
    # STRIPE — billing & subscriptions
    # ========================================================================
    STRIPE_SECRET_KEY: str = "sk_test_REPLACE_ME"
    STRIPE_PUBLISHABLE_KEY: str = "pk_test_REPLACE_ME"
    STRIPE_WEBHOOK_SECRET: str = "whsec_REPLACE_ME"
    # Price IDs from Stripe Dashboard
    STRIPE_PRICE_STARTER_MONTHLY: str = ""
    STRIPE_PRICE_STARTER_YEARLY: str = ""
    STRIPE_PRICE_PRO_MONTHLY: str = ""
    STRIPE_PRICE_PRO_YEARLY: str = ""

    # ========================================================================
    # ENEDIS DATAHUB — OAuth2 connector
    # ========================================================================
    ENEDIS_CLIENT_ID: Optional[str] = None
    ENEDIS_CLIENT_SECRET: Optional[str] = None
    # Redirect URI must match what's registered on https://datahub-enedis.fr
    ENEDIS_REDIRECT_URI: Optional[str] = None
    # Base URLs (override for sandbox)
    ENEDIS_AUTH_URL: str = "https://mon-compte-particulier.enedis.fr/dataconnect/v1/oauth2/authorize"
    ENEDIS_TOKEN_URL: str = "https://datahub-enedis.fr/oauth2/v3/token"
    ENEDIS_API_BASE: str = "https://datahub-enedis.fr"

    # ========================================================================
    # APP URL (used in emails and redirect URLs)
    # ========================================================================
    APP_URL: str = "http://localhost:3000"
    TRIAL_DAYS: int = 14

    # ========================================================================
    # SENTRY — error monitoring & performance tracing
    # ========================================================================
    SENTRY_DSN: Optional[str] = None              # None = disabled
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1        # 10% of requests traced
    SENTRY_PROFILES_SAMPLE_RATE: float = 0.1      # 10% profiled

    # ========================================================================
    # MONITORING
    # ========================================================================
    PROMETHEUS_ENABLED: bool = True
    PROMETHEUS_PORT: int = 9090
    DATADOG_API_KEY: Optional[str] = None
    DATADOG_APP_KEY: Optional[str] = None
    DATADOG_SITE: str = "datadoghq.eu"
    DATADOG_ENABLED: bool = False
    SENTRY_ENVIRONMENT: str = "development"

    # ========================================================================
    # RATE LIMITING
    # ========================================================================
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_STORAGE_URL: Optional[str] = None
    RATE_LIMIT_TIER_STARTER: int = 100
    RATE_LIMIT_TIER_PRO: int = 1000
    RATE_LIMIT_TIER_ENTERPRISE: int = 10000

    # ========================================================================
    # CORS
    # ========================================================================
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:8000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]
    )
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = Field(
        default_factory=lambda: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
    )
    CORS_ALLOW_HEADERS: List[str] = Field(
        default_factory=lambda: [
            "Content-Type",
            "Authorization",
            "Accept",
            "X-Requested-With",
            "X-CSRF-Token",
        ]
    )

    # ========================================================================
    # LOGGING
    # ========================================================================
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_FILE: str = "/var/log/esgflow/app.log"

    # ========================================================================
    # DATA QUALITY
    # ========================================================================
    DATA_QUALITY_MIN_SCORE: float = 0.7
    DATA_QUALITY_CHECK_ENABLED: bool = True

    # ========================================================================
    # ESG SCORING
    # ========================================================================
    SCORING_DEFAULT_METHODOLOGY: str = "internal_v1"
    SCORING_CALCULATION_TIMEOUT_SECONDS: int = 300

    # ========================================================================
    # REPORTING
    # ========================================================================
    REPORT_GENERATION_TIMEOUT_SECONDS: int = 600
    REPORT_MAX_FILE_SIZE_MB: int = 50
    REPORT_STORAGE_DAYS: int = 365

    # ========================================================================
    # OPENAI / AI RECOMMENDATIONS
    # ========================================================================
    OPENAI_API_KEY: Optional[str] = Field(default=None)
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Objectif de réduction d'émissions par défaut (−30 % d'ici N+1)
    ML_DEFAULT_OBJECTIVE_PCT: float = -30.0
    # Horizon de prédiction par défaut (mois)
    ML_FORECAST_HORIZON_MONTHS: int = 12

    # ========================================================================
    # FEATURE FLAGS
    # ========================================================================
    FEATURE_ANALYTICS_ENABLED: bool = True
    FEATURE_ML_PREDICTIONS_ENABLED: bool = True   # Activated — uses graceful fallback
    FEATURE_AI_RECOMMENDATIONS_ENABLED: bool = True
    FEATURE_BLOCKCHAIN_AUDIT: bool = False
    FEATURE_REALTIME_IOT: bool = False

    # ========================================================================
    # DEVELOPMENT
    # ========================================================================
    RELOAD: bool = True
    PROFILING_ENABLED: bool = False
    API_DOCS_ENABLED: bool = True

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.APP_ENV == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.APP_ENV == "production"

    @property
    def database_url_sync(self) -> str:
        """Get synchronous database URL for Alembic."""
        return str(self.DATABASE_URL).replace("+asyncpg", "")

    def get_kafka_config(self) -> Dict[str, Any]:
        """Get Kafka configuration dictionary."""
        config = {
            "bootstrap.servers": self.KAFKA_BOOTSTRAP_SERVERS,
            "security.protocol": self.KAFKA_SECURITY_PROTOCOL,
        }
        
        if self.KAFKA_SASL_MECHANISM:
            config["sasl.mechanism"] = self.KAFKA_SASL_MECHANISM
            config["sasl.username"] = self.KAFKA_SASL_USERNAME
            config["sasl.password"] = self.KAFKA_SASL_PASSWORD
        
        return config


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    
    This function uses lru_cache to ensure settings are loaded only once
    and reused across the application.
    """
    return Settings()


# Global settings instance
settings = get_settings()
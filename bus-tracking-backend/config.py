import os


class Config:
    # Core
    DEBUG = os.getenv("DEBUG", "true").lower() == "true"
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

    # Database: prefer DATABASE_URL; default to local SQLite for dev
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(os.path.dirname(__file__), 'app.db')}",
    )

    # JWT/Auth
    JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-prod")
    JWT_EXPIRES_MIN = int(os.getenv("JWT_EXPIRES_MIN", "60"))

    # CORS
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

    # Observability
    SENTRY_DSN = os.getenv("SENTRY_DSN", "")
    PROMETHEUS_ENABLED = os.getenv("PROMETHEUS_ENABLED", "true").lower() == "true"

    # Realtime/cache optional
    REDIS_URL = os.getenv("REDIS_URL", "")



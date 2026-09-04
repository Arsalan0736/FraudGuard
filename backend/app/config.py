"""Centralized configuration loaded from environment variables."""
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def _env(key: str, default: str | None = None) -> str:
    val = os.environ.get(key, default)
    if val is None:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return val


class Config:
    # MySQL
    DB_HOST = os.environ.get("DB_HOST", "localhost")
    DB_PORT = int(os.environ.get("DB_PORT", "3306"))
    DB_USER = os.environ.get("DB_USER", "root")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "changeme")
    DB_NAME = os.environ.get("DB_NAME", "fraudguard")

    @classmethod
    def db_uri(cls) -> str:
        return (
            f"mysql+pymysql://{cls.DB_USER}:{cls.DB_PASSWORD}"
            f"@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}?charset=utf8mb4"
        )

    # JWT
    JWT_SECRET = _env("JWT_SECRET", "dev-secret-change-me")
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRES = timedelta(hours=int(os.environ.get("JWT_EXPIRES_HOURS", "24")))

    # LLM
    LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "gemini")
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
    GEMINI_URL = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{os.environ.get('GEMINI_MODEL', 'gemini-1.5-flash')}:generateContent"
    )

    # Mongo (optional)
    MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB = os.environ.get("MONGO_DB", "fraudguard")

    # ML artifact
    MODEL_PATH = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "artifacts",
        "fraud_model.joblib",
    )

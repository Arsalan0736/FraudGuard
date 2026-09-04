"""SQLAlchemy session/engine factory."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session

from .config import Config
from .models import Base

engine = create_engine(Config.db_uri(), pool_pre_ping=True, pool_recycle=3600, future=True)
SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True))


def init_db() -> None:
    """Create tables if they don't exist (useful for quick starts)."""
    Base.metadata.create_all(bind=engine)


def get_session():
    """Return a session; commit/rollback must be handled by caller."""
    return SessionLocal()

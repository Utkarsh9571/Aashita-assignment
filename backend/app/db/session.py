from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# pool_pre_ping verifies connections are alive before handing them out,
# which is critical for cloud environments like Render/Neon where connections may idle out.
engine = create_engine(
    settings.sync_database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a database session and safely closes it upon request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

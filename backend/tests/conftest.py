import os
import sys
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import get_settings
from app.db.session import Base, get_db
from app.main import app
from app.seed import seed_rooms

settings = get_settings()

engine = create_engine(settings.sync_database_url)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure database tables and seeded rooms are present."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_rooms(db)
    db.close()


@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """
    Function-scoped session with rollback to ensure test isolation.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture(scope="function")
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """
    TestClient that overrides the get_db dependency to use the isolated db_session fixture.
    """
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

"""
Shared checks for integration tests (MySQL + Redis + loaded .env).
"""

from __future__ import annotations

import os
import uuid

import pytest
import pytest_asyncio


def pytest_configure():
    # Load .env for Settings() when running pytest from repo root
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except ImportError:
        pass


@pytest.fixture(scope="session")
def integration_ready():
    """
    Skip integration tests when the stack is not reachable or misconfigured.
    Set FORCE_INTEGRATION_TESTS=1 to fail instead of skip (CI with services up).
    """
    force = os.environ.get("FORCE_INTEGRATION_TESTS") == "1"
    try:
        from app.config import settings
    except Exception as exc:
        if force:
            raise
        pytest.skip(f"App settings not loadable: {exc}")

    try:
        import redis as redis_sync

        r = redis_sync.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        try:
            r.ping()
        finally:
            r.close()
    except Exception as exc:
        if force:
            raise
        pytest.skip(f"Redis not reachable ({settings.REDIS_URL!r}): {exc}")

    try:
        from sqlalchemy import create_engine, text

        # Sync ping only — avoids binding aiomysql connections to a different loop than pytest-asyncio
        engine = create_engine(settings.DATABASE_URL_SYNC)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine.dispose()
    except Exception as exc:
        if force:
            raise
        pytest.skip(f"MySQL (DATABASE_URL_SYNC / pymysql) not reachable: {exc}")

    return True


@pytest.fixture
def unique_suffix() -> str:
    return uuid.uuid4().hex[:10]


@pytest_asyncio.fixture(autouse=True)
async def _dispose_async_engine_after_test():
    """
    Pytest-asyncio uses a new event loop per test by default; pooled aiomysql
    connections and the module-level aioredis client stay bound to the previous
    loop unless we dispose/close them.
    """
    yield
    from app.database import engine

    await engine.dispose()

    from app.utils.redis_client import close_redis_client

    await close_redis_client()

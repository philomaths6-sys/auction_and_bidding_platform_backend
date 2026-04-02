import redis.asyncio as aioredis
from app.config import settings
 
_redis: aioredis.Redis | None = None
 
async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def close_redis_client() -> None:
    """Close the shared async Redis client (e.g. tests or process shutdown)."""
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
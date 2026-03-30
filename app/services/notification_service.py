from sqlalchemy.ext.asyncio import AsyncSession
from app.models.social import Notification


async def send_notification(user_id: int, type: str, message: str, db: AsyncSession):
    db.add(Notification(user_id=user_id, type=type, message=message))
    await db.flush()
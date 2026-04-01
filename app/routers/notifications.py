from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.social import Notification
from app.schemas.social import NotificationResponse
from app.dependencies import get_current_user

router = APIRouter(prefix='/notifications', tags=['Notifications'])


@router.get('/', response_model=List[NotificationResponse])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()


@router.put('/{notif_id}/read')
async def mark_read(
    notif_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    notif = await db.get(Notification, notif_id)
    if not notif or notif.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, 'Notification not found')
    notif.is_read = True
    await db.commit()
    return {'status': 'read'}


@router.put('/read-all')
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    for notif in result.scalars().all():
        notif.is_read = True
    await db.commit()
    return {'status': 'all read'}


# ─── SECTION: Unread Count (NEW) ─────────────────────────────────────────────

@router.get('/unread-count')
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns the number of unread notifications for the current user."""
    from sqlalchemy import func
    result = await db.execute(
        select(func.count()).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
    )
    return {'unread': result.scalar()}

# ─── END SECTION: Unread Count ───────────────────────────────────────────────
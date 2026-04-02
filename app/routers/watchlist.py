from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.social import Watchlist
from app.models.auction import Auction
from app.schemas.auction import AuctionResponse
from app.dependencies import get_current_user

router = APIRouter(prefix='/watchlist', tags=['Watchlist'])


@router.post('/{auction_id}', status_code=201)
async def add_to_watchlist(
    auction_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    auction = await db.get(Auction, auction_id)
    if not auction:
        raise HTTPException(status.HTTP_404_NOT_FOUND, 'Auction not found')

    existing = await db.execute(select(Watchlist).where(
        Watchlist.user_id == current_user.id,
        Watchlist.auction_id == auction_id
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, 'Already in watchlist')

    db.add(Watchlist(user_id=current_user.id, auction_id=auction_id))
    await db.commit()
    return {'message': 'Added'}


@router.get('/', response_model=List[AuctionResponse])
async def get_watchlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Auction)
        .options(
            selectinload(Auction.seller),
            selectinload(Auction.images),
            selectinload(Auction.attributes),
        )
        .join(Watchlist)
        .where(Watchlist.user_id == current_user.id)
    )
    return result.scalars().all()


@router.delete('/{auction_id}', status_code=204)
async def remove_watchlist(
    auction_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Watchlist).where(
        Watchlist.user_id == current_user.id,
        Watchlist.auction_id == auction_id
    ))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status.HTTP_404_NOT_FOUND, 'Not in watchlist')
    await db.delete(entry)
    await db.commit()
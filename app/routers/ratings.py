from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.transaction import SellerRating, AuctionWinner
from app.schemas.social import RatingCreate, RatingResponse
from app.dependencies import get_current_user

router = APIRouter(prefix='/ratings', tags=['Ratings'])


@router.post('/', response_model=RatingResponse, status_code=201)
async def create_rating(
    data: RatingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    winner = await db.execute(select(AuctionWinner).where(
        AuctionWinner.auction_id == data.auction_id,
        AuctionWinner.winner_user_id == current_user.id
    ))
    if not winner.scalar_one_or_none():
        raise HTTPException(status.HTTP_403_FORBIDDEN, 'Only the auction winner can leave a rating')

    existing = await db.execute(select(SellerRating).where(
        SellerRating.seller_id == data.seller_id,
        SellerRating.buyer_id == current_user.id
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, 'You have already rated this seller')

    rating = SellerRating(
        seller_id=data.seller_id,
        buyer_id=current_user.id,
        rating=data.rating,
        review=data.review
    )
    db.add(rating)
    await db.commit()
    await db.refresh(rating)
    return rating


@router.get('/seller/{seller_id}', response_model=List[RatingResponse])
async def get_seller_ratings(seller_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SellerRating)
        .where(SellerRating.seller_id == seller_id)
        .order_by(SellerRating.created_at.desc())
    )
    return result.scalars().all()
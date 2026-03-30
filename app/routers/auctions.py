from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.auction import Auction, AuctionImage, AuctionAttribute
from app.models.admin import AuctionView
from app.schemas.auction import AuctionCreate, AuctionResponse
from app.dependencies import get_current_user, get_optional_user
from app.models.user import User
 
router = APIRouter(prefix='/auctions', tags=['Auctions'])
 
@router.post('/', response_model=AuctionResponse, status_code=201)
async def create_auction(
    data: AuctionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if data.end_time <= data.start_time:
        raise HTTPException(400, 'end_time must be after start_time')
    auction = Auction(
        **data.model_dump(exclude_none=True),
        seller_id=current_user.id,
        current_price=data.starting_price
    )
    db.add(auction)
    await db.commit()
    await db.refresh(auction)
    return auction
 
@router.get('/', response_model=list[AuctionResponse])
async def list_auctions(
    status: str | None = None,
    category_id: int | None = None,
    skip: int = 0, limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    q = select(Auction)
    if status:      q = q.where(Auction.auction_status == status)
    if category_id: q = q.where(Auction.category_id == category_id)
    result = await db.execute(q.order_by(Auction.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()
 
@router.get('/{auction_id}', response_model=AuctionResponse)
async def get_auction(
    auction_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    auction = await db.get(Auction, auction_id)
    if not auction: raise HTTPException(404, 'Auction not found')
    db.add(AuctionView(
        auction_id=auction_id,
        user_id=current_user.id if current_user else None,
        ip_address=request.client.host
    ))
    auction.total_views += 1
    await db.commit()
    await db.refresh(auction)
    return auction
 
@router.delete('/{auction_id}', status_code=204)
async def delete_auction(
    auction_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    auction = await db.get(Auction, auction_id)
    if not auction or auction.seller_id != current_user.id:
        raise HTTPException(403, 'Not authorised')
    if auction.auction_status == 'active':
        raise HTTPException(400, 'Cannot delete an active auction')
    await db.delete(auction)
    await db.commit()
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.bid import Bid
from app.schemas.bid import BidCreate, BidResponse
from app.dependencies import get_current_user
from app.models.user import User
from app.services import bid_service
from app.utils.ws_manager import ws_manager
 
router = APIRouter(prefix='/auctions', tags=['Bidding'])
 
@router.post('/{auction_id}/bid', response_model=BidResponse)
async def place_bid(
    auction_id: int,
    data: BidCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        bid = await bid_service.place_bid(
            auction_id, current_user.id, data.bid_amount, db
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    await ws_manager.broadcast(auction_id, {
        'event': 'bid_placed',
        'current_price': str(bid.bid_amount),
        'total_bids': bid.auction.total_bids if hasattr(bid, 'auction') else None,
        'bidder_id': current_user.id
    })
    return bid
 
@router.get('/{auction_id}/bids', response_model=list[BidResponse])
async def list_bids(auction_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Bid).where(Bid.auction_id == auction_id).order_by(Bid.bid_time.desc())
    )
    return result.scalars().all()
 
@router.websocket('/ws/{auction_id}')
async def auction_ws(auction_id: int, websocket: WebSocket):
    await ws_manager.connect(auction_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(auction_id, websocket)
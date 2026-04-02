from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.bid import Bid, BidHistory
from app.models.transaction import AuctionWinner
from app.schemas.bid import BidCreate, BidResponse, MyBidResponse
from app.dependencies import get_current_user
from app.models.user import User
from app.services import bid_service
from app.utils.ws_manager import ws_manager

router = APIRouter(prefix='/auctions', tags=['Bidding'])


@router.get('/my-bids', response_model=list[MyBidResponse])
async def my_bids(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns all bids placed by the currently authenticated user."""
    print(f"DEBUG: my-bids called for user {current_user.id}")
    try:
        result = await db.execute(
            select(Bid)
            .options(selectinload(Bid.auction))
            .where(Bid.bidder_id == current_user.id)
            .order_by(Bid.bid_time.desc())
        )
        bids = result.scalars().all()
        print(f"DEBUG: Found {len(bids)} bids")
        
        my_bids = []
        for b in bids:
            try:
                print(f"DEBUG: Processing bid {b.id}, auction: {b.auction}")
                auction_title = b.auction.title if b.auction else f"Deleted Auction #{b.auction_id}" if b.auction_id else "Unknown Auction"
                bid_response = MyBidResponse(
                    **BidResponse.model_validate(b).model_dump(),
                    auction_title=auction_title,
                )
                my_bids.append(bid_response)
                print(f"DEBUG: Successfully processed bid {b.id} - {auction_title}")
            except Exception as e:
                print(f"DEBUG: Error processing bid {b.id}: {e}")
                continue
        
        print(f"DEBUG: Returning {len(my_bids)} bids")
        return my_bids
    except Exception as e:
        print(f"DEBUG: Endpoint error: {e}")
        import traceback
        traceback.print_exc()
        raise


@router.get('/my-wins', response_model=list[MyBidResponse])
async def my_wins(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns all auctions won by the currently authenticated user."""
    result = await db.execute(
        select(AuctionWinner)
        .options(selectinload(AuctionWinner.auction))
        .where(AuctionWinner.winner_user_id == current_user.id)
        .order_by(AuctionWinner.won_at.desc())
    )
    wins = result.scalars().all()
    
    # Get the winning bids for each won auction
    winning_bids = []
    for win in wins:
        try:
            bid_result = await db.execute(
                select(Bid)
                .options(selectinload(Bid.auction))
                .where(Bid.id == win.winning_bid_id)
            )
            winning_bid = bid_result.scalar_one_or_none()
            if winning_bid and winning_bid.auction_id is not None:
                winning_bids.append(
                    MyBidResponse(
                        **BidResponse.model_validate(winning_bid).model_dump(),
                        auction_title=winning_bid.auction.title if winning_bid.auction else None,
                    )
                )
        except Exception as e:
            # Skip wins that cause validation errors
            continue
    
    return winning_bids


@router.get('/{auction_id}/bids', response_model=list[BidResponse])
async def get_bids_for_auction(
    auction_id: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Bid)
        .where(Bid.auction_id == auction_id)
        .order_by(Bid.bid_time.desc())
    )
    return result.scalars().all()


@router.post('/{auction_id}/bid', response_model=BidResponse)
async def place_bid(
    auction_id: int,
    data: BidCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        bid, bid_meta = await bid_service.place_bid(
            auction_id, current_user.id, data.bid_amount, db
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Eagerly reload the bid with its auction for response serialization
    result = await db.execute(
        select(Bid)
        .options(selectinload(Bid.auction))
        .where(Bid.id == bid.id)
    )
    bid = result.scalar_one()

    end_t = bid_meta.get('auction_end_time')
    new_end_iso = end_t.isoformat() if end_t is not None else None

    await ws_manager.broadcast(auction_id, {
        'event': 'bid_placed',
        'current_price': str(bid.bid_amount),
        'total_bids': bid_meta.get('total_bids'),
        'bidder_id': current_user.id,
        'new_end_time': new_end_iso,
        'time_extended': bool(bid_meta.get('time_extended')),
    })
    return bid


@router.websocket('/ws/{auction_id}')
async def auction_ws(auction_id: int, websocket: WebSocket):
    await ws_manager.connect(auction_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(auction_id, websocket)


# ─── SECTION: Bid History ─────────────────────────────────────────────────────

class BidHistoryResponse(BaseModel):
    id: int
    auction_id: int
    bid_id: int
    previous_price: Decimal
    new_price: Decimal
    timestamp: datetime
    model_config = {'from_attributes': True}


@router.get('/{auction_id}/bid-history', response_model=list[BidHistoryResponse])
async def get_bid_history(auction_id: int, db: AsyncSession = Depends(get_db)):
    """Full chronological price history for an auction."""
    result = await db.execute(
        select(BidHistory)
        .where(BidHistory.auction_id == auction_id)
        .order_by(BidHistory.timestamp.asc())
    )
    return result.scalars().all()

# ─── END SECTION: Bid History ─────────────────────────────────────────────────
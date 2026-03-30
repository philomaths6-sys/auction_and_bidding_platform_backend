from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.auction import Auction
from app.models.bid import Bid, BidHistory, AuctionExtension
from app.models.social import Notification
from app.utils.redis_client import get_redis
 
ANTI_SNIPE_WINDOW  = 60   # seconds before end to trigger extension
ANTI_SNIPE_EXTEND  = 30   # seconds to add
 
async def place_bid(
    auction_id: int,
    bidder_id: int,
    amount: Decimal,
    db: AsyncSession
) -> Bid:
    redis = await get_redis()
    lock_key = f'lock:auction:{auction_id}'
 
    async with redis.lock(lock_key, timeout=10, blocking_timeout=5):
 
        # MySQL InnoDB row lock — atomic with the rest of the transaction
        result = await db.execute(
            select(Auction)
            .where(Auction.id == auction_id)
            .with_for_update()   # SELECT ... FOR UPDATE
        )
        auction = result.scalar_one_or_none()
 
        if not auction:
            raise ValueError('Auction not found')
        if auction.auction_status != 'active':
            raise ValueError('Auction is not active')
        if datetime.utcnow() > auction.end_time:
            raise ValueError('Auction has ended')
        if amount <= auction.current_price:
            raise ValueError(f'Bid must exceed current price of {auction.current_price}')
        if bidder_id == auction.seller_id:
            raise ValueError('Seller cannot bid on own auction')
 
        # Unmark previous winning bid
        prev_result = await db.execute(
            select(Bid).where(Bid.auction_id == auction_id, Bid.is_winning_bid == True)
        )
        prev_bid = prev_result.scalar_one_or_none()
        if prev_bid:
            prev_bid.is_winning_bid = False
            db.add(Notification(
                user_id=prev_bid.bidder_id,
                type='outbid',
                message=f'You were outbid on auction #{auction_id}. New price: {amount}'
            ))
 
        # Insert new winning bid
        bid = Bid(
            auction_id=auction_id,
            bidder_id=bidder_id,
            bid_amount=amount,
            is_winning_bid=True
        )
        db.add(bid)
        await db.flush()   # get bid.id
 
        # Price history
        db.add(BidHistory(
            auction_id=auction_id,
            bid_id=bid.id,
            previous_price=auction.current_price,
            new_price=amount
        ))
 
        # Update auction price
        auction.current_price = amount
        auction.total_bids   += 1
 
        # Anti-snipe extension
        seconds_left = (auction.end_time - datetime.utcnow()).total_seconds()
        if seconds_left < ANTI_SNIPE_WINDOW:
            auction.end_time += timedelta(seconds=ANTI_SNIPE_EXTEND)
            db.add(AuctionExtension(
                auction_id=auction_id,
                extended_seconds=ANTI_SNIPE_EXTEND,
                triggered_by_bid=bid.id
            ))
 
        await db.commit()
        await db.refresh(bid)
        return bid
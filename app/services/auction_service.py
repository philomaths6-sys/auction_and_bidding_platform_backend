from datetime import datetime
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.auction import Auction
from app.models.bid import Bid
from app.models.transaction import AuctionWinner
from app.models.social import Notification


async def close_ended_auctions():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Auction).where(
                Auction.auction_status == 'active',
                Auction.end_time <= datetime.utcnow()
            )
        )
        auctions = result.scalars().all()

        for auction in auctions:
            auction.auction_status = 'ended'

            bid_result = await db.execute(
                select(Bid).where(
                    Bid.auction_id == auction.id,
                    Bid.is_winning_bid == True
                )
            )
            winning_bid = bid_result.scalar_one_or_none()

            if winning_bid:
                db.add(AuctionWinner(
                    auction_id=auction.id,
                    winner_user_id=winning_bid.bidder_id,
                    winning_bid_id=winning_bid.id,
                    winning_amount=winning_bid.bid_amount
                ))
                db.add(Notification(
                    user_id=winning_bid.bidder_id,
                    type='won',
                    message=f'You won auction #{auction.id}! Please complete payment.'
                ))
                db.add(Notification(
                    user_id=auction.seller_id,
                    type='auction_ended',
                    message=f'Auction #{auction.id} ended. Winning bid: {winning_bid.bid_amount}'
                ))

        await db.commit()
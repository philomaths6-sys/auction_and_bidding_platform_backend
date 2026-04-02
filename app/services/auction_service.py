from datetime import datetime, timezone
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.auction import Auction
from app.models.bid import Bid
from app.models.transaction import AuctionWinner
from app.models.social import Notification


async def close_ended_auctions():
    async with AsyncSessionLocal() as db:
        current_time = datetime.now(timezone.utc)
        result = await db.execute(
            select(Auction).where(
                Auction.auction_status.in_(['active', 'cancelled'])
            )
        )
        auctions = result.scalars().all()

        for auction in auctions:
            # Handle timezone - auction end_time might be naive or timezone-aware
            auction_end_time = auction.end_time
            if auction_end_time.tzinfo is None:
                # If naive, assume it's UTC
                auction_end_time = auction_end_time.replace(tzinfo=timezone.utc)
            
            was_active = auction.auction_status == 'active'
            
            # Check if auction should be ended
            if auction_end_time <= current_time and auction.auction_status != 'ended':
                auction.auction_status = 'ended'

            # Only create winner and notifications for auctions that were active (not cancelled)
            if was_active and auction_end_time <= current_time:
                bid_result = await db.execute(
                    select(Bid).where(
                        Bid.auction_id == auction.id,
                        Bid.is_winning_bid == True
                    )
                )
                winning_bids = bid_result.scalars().all()
                
                # Take the highest bid as the winner (there should only be one, but handle edge cases)
                winning_bid = max(winning_bids, key=lambda b: b.bid_amount) if winning_bids else None

                if winning_bid:
                    # First, mark all bids as not winning
                    all_bids_result = await db.execute(
                        select(Bid).where(Bid.auction_id == auction.id)
                    )
                    all_bids = all_bids_result.scalars().all()
                    for bid in all_bids:
                        bid.is_winning_bid = False
                    
                    # Mark the actual winner
                    winning_bid.is_winning_bid = True
                    
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
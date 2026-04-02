from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
 
class BidCreate(BaseModel):
    bid_amount: Decimal
 
class BidResponse(BaseModel):
    id: int
    auction_id: int | None = None
    bidder_id: int
    bid_amount: Decimal
    bid_time: datetime
    is_winning_bid: bool
    model_config = {'from_attributes': True}


class MyBidResponse(BidResponse):
    """Bid row for /my-bids with related auction title for dashboards."""
    auction_title: str | None = None
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
 
class BidCreate(BaseModel):
    bid_amount: Decimal
 
class BidResponse(BaseModel):
    id: int
    auction_id: int
    bidder_id: int
    bid_amount: Decimal
    bid_time: datetime
    is_winning_bid: bool
    model_config = {'from_attributes': True}
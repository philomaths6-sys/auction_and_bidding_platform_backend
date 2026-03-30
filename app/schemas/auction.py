from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import List
 
class AuctionCreate(BaseModel):
    title: str
    description: str
    category_id: int
    starting_price: Decimal
    reserve_price: Decimal | None = None
    start_time: datetime
    end_time: datetime
 
class AuctionAttributeResponse(BaseModel):
    attribute_name: str
    attribute_value: str
    model_config = {'from_attributes': True}
 
class AuctionResponse(BaseModel):
    id: int
    title: str
    description: str
    seller_id: int
    category_id: int
    starting_price: Decimal
    current_price: Decimal
    auction_status: str
    start_time: datetime
    end_time: datetime
    total_bids: int
    total_views: int
    attributes: List[AuctionAttributeResponse] = []
    model_config = {'from_attributes': True}
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import Optional


class PaymentCreate(BaseModel):
    auction_id: int
    payment_method: str  # e.g. 'credit_card' | 'bank_transfer' | 'paypal'


class PaymentResponse(BaseModel):
    id: int
    auction_id: int
    buyer_id: int
    seller_id: int
    amount: Decimal
    payment_status: str
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    created_at: datetime
    auction_title: Optional[str] = None

    model_config = {'from_attributes': True}


class WinnerResponse(BaseModel):
    id: int
    auction_id: int
    winner_user_id: int
    winning_bid_id: int
    winning_amount: Decimal
    won_at: datetime

    model_config = {'from_attributes': True}
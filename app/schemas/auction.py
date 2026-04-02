from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import List, Optional


# ─── SECTION: Category (NEW) ──────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parent_category_id: Optional[int] = None   # Optional. If provided, makes this a subcategory.


class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    parent_category_id: Optional[int] = None
    is_active: bool = True
    created_at: datetime
    model_config = {'from_attributes': True}

# ─── END SECTION: Category ────────────────────────────────────────────────────


class AuctionCreate(BaseModel):
    title: str
    description: str
    category_id: int
    starting_price: Decimal
    reserve_price: Decimal | None = None
    start_time: datetime | None = None
    end_time: datetime


# ─── SECTION: AuctionUpdate (NEW) ────────────────────────────────────────────

class AuctionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    reserve_price: Optional[Decimal] = None
    end_time: Optional[datetime] = None

# ─── END SECTION: AuctionUpdate ───────────────────────────────────────────────


# ─── SECTION: AuctionAttributes (NEW) ────────────────────────────────────────

class AuctionAttributeCreate(BaseModel):
    attribute_name: str
    attribute_value: str


class AuctionAttributeResponse(BaseModel):
    id: int                         # id field added
    attribute_name: str
    attribute_value: str
    model_config = {'from_attributes': True}

# ─── END SECTION: AuctionAttributes ──────────────────────────────────────────


# ─── SECTION: Auction Images (NEW) ───────────────────────────────────────────

class AuctionImageCreate(BaseModel):
    image_url: str
    is_primary: bool = False


class AuctionImageResponse(BaseModel):
    id: int
    auction_id: int
    image_url: str
    is_primary: bool
    uploaded_at: datetime
    model_config = {'from_attributes': True}

# ─── END SECTION: Auction Images ─────────────────────────────────────────────


class AuctionResponse(BaseModel):
    id: int
    title: str
    description: str
    seller_id: int
    seller_username: str | None = None
    category_id: int
    category_name: str | None = None
    starting_price: Decimal
    current_price: Decimal
    auction_status: str
    start_time: datetime
    end_time: datetime
    total_bids: int
    total_views: int
    attributes: List[AuctionAttributeResponse] = []
    images: List[AuctionImageResponse] = []    # images field added
    model_config = {'from_attributes': True}


class HomeFeedResponse(BaseModel):
    featured: List[AuctionResponse] = []
    latest: List[AuctionResponse] = []


# ─── SECTION: Auction Status & Winner (NEW) ───────────────────────────────────

class AuctionStatusUpdate(BaseModel):
    """Allowed transitions: draft → active, active → cancelled."""
    status: str   # 'active' | 'cancelled'


class AuctionWinnerResponse(BaseModel):
    id: int
    auction_id: int
    winner_user_id: int
    winning_bid_id: int
    winning_amount: Decimal
    won_at: datetime
    model_config = {'from_attributes': True}

# ─── END SECTION: Auction Status & Winner ─────────────────────────────────────
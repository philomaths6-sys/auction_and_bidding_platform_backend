from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, List


# ─── Comment ──────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    comment_text: str
    parent_comment_id: Optional[int] = None


class CommentResponse(BaseModel):
    id: int
    auction_id: int
    user_id: int
    comment_text: str
    parent_comment_id: Optional[int] = None
    created_at: datetime
    replies: List['CommentResponse'] = []

    model_config = {'from_attributes': True}

CommentResponse.model_rebuild()  # required for self-referencing model


# ─── Notification ──────────────────────────────────────────────────

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    type: str
    message: str
    is_read: bool
    created_at: datetime

    model_config = {'from_attributes': True}


# ─── Watchlist ─────────────────────────────────────────────────────

class WatchlistResponse(BaseModel):
    id: int
    user_id: int
    auction_id: int
    created_at: datetime

    model_config = {'from_attributes': True}


# ─── Rating ────────────────────────────────────────────────────────

class RatingCreate(BaseModel):
    seller_id: int
    auction_id: int
    rating: int
    review: Optional[str] = None

    @field_validator('rating')
    @classmethod
    def rating_range(cls, v):
        if not 1 <= v <= 5:
            raise ValueError('Rating must be between 1 and 5')
        return v


class RatingResponse(BaseModel):
    id: int
    seller_id: int
    buyer_id: int
    rating: int
    review: Optional[str] = None
    created_at: datetime

    model_config = {'from_attributes': True}
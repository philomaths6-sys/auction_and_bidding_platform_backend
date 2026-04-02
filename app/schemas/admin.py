from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class ReportCreate(BaseModel):
    auction_id: int
    reason: str


class ReportResponse(BaseModel):
    id: int
    auction_id: int
    reported_by: int
    reason: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {'from_attributes': True}


class ReportDetailResponse(ReportResponse):
    """Report row for admin UI with joined user + auction labels."""
    reporter_username: Optional[str] = None
    auction_title: Optional[str] = None


class FraudFlagResponse(BaseModel):
    id: int
    user_id: int
    auction_id: int
    reason: Optional[str] = None
    flagged_at: datetime

    model_config = {'from_attributes': True}


class AdminLogResponse(BaseModel):
    id: int
    admin_id: int
    action: str
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    created_at: datetime

    model_config = {'from_attributes': True}


class FeaturedAuctionsUpdateRequest(BaseModel):
    auction_ids: List[int] = Field(default_factory=list, max_length=12)
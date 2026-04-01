from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator('password')
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class ProfileData(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    profile_image: Optional[str] = None
    model_config = {'from_attributes': True}


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_verified: bool
    created_at: datetime
    profile: Optional[ProfileData] = None
    model_config = {'from_attributes': True}


# ─── SECTION: UserPublicResponse (NEW) ───────────────────────────────────────

class UserPublicResponse(BaseModel):
    """Public-facing profile for any user (e.g. to view a seller's page)."""
    id: int
    username: str
    role: str
    created_at: datetime
    model_config = {'from_attributes': True}

# ─── END SECTION: UserPublicResponse ─────────────────────────────────────────


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    profile_image: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    bio: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class Token(BaseModel):
    access_token: str
    token_type: str = 'bearer'


# ─── SECTION: AdminPromoteRequest (NEW) ──────────────────────────────────────

class AdminPromoteRequest(BaseModel):
    user_id: int

# ─── END SECTION: AdminPromoteRequest ────────────────────────────────────────
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
 
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
 
class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_verified: bool
    created_at: datetime
    model_config = {'from_attributes': True}
 
class ProfileUpdate(BaseModel):
    full_name: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    bio: str | None = None
 
class Token(BaseModel):
    access_token: str
    token_type: str = 'bearer'
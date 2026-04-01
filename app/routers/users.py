from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserProfile
from app.schemas.user import UserResponse, UserPublicResponse, ProfileUpdate, ChangePasswordRequest
from app.dependencies import get_current_user
from app.utils.auth import verify_password, hash_password


router = APIRouter(prefix='/users', tags=['Users'])


@router.get('/me', response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put('/me/profile')
async def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    profile = current_user.profile
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile


@router.put('/me/password')
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(400, 'Current password is incorrect')
    current_user.password_hash = hash_password(data.new_password)
    await db.commit()
    return {'status': 'ok'}


# ─── SECTION: Public User Profile (NEW) ──────────────────────────────────────

@router.get('/{user_id}', response_model=UserPublicResponse)
async def get_public_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    """Return public info for any user (e.g. to view a seller's profile)."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, 'User not found')
    return user

# ─── END SECTION: Public User Profile ────────────────────────────────────────
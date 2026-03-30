from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.utils.auth import decode_token
 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl='/auth/login')
optional_oauth2 = OAuth2PasswordBearer(tokenUrl='/auth/login', auto_error=False)
 
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    try:
        payload = decode_token(token)
        user_id = int(payload.get('sub'))
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'Invalid or expired token')
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, 'User not found')
    if user.role == 'banned':
        raise HTTPException(status.HTTP_403_FORBIDDEN, 'Account suspended')
    return user
 
async def get_optional_user(
    token: str | None = Depends(optional_oauth2),
    db: AsyncSession = Depends(get_db)
) -> User | None:
    if not token:
        return None
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None
 
async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != 'admin':
        raise HTTPException(status.HTTP_403_FORBIDDEN, 'Admin access required')
    return current_user
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, UserProfile
from app.schemas.user import UserCreate, UserResponse, Token
from app.utils.auth import hash_password, verify_password, create_access_token
 
router = APIRouter(prefix='/auth', tags=['Authentication'])
 
@router.post('/register', response_model=UserResponse, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, 'Email already registered')
    # Check username uniqueness
    existing_u = await db.execute(select(User).where(User.username == data.username))
    if existing_u.scalar_one_or_none():
        raise HTTPException(400, 'Username already taken')
    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password)
    )
    db.add(user)
    await db.flush()               # get user.id before commit
    db.add(UserProfile(user_id=user.id))
    await db.commit()
    await db.refresh(user)
    return user
 
@router.post('/login', response_model=Token)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(401, 'Invalid credentials')
    token = create_access_token({'sub': str(user.id)})
    return {'access_token': token, 'token_type': 'bearer'}
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.models.auction import Category
from app.models.user import User
from app.schemas.auction import CategoryCreate, CategoryResponse
from app.dependencies import require_admin


router = APIRouter(prefix='/categories', tags=['Categories'])


# ─── SECTION: Category CRUD ───────────────────────────────────────────────────

@router.post('/', response_model=CategoryResponse, status_code=201)
async def create_category(
    data: CategoryCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin only: create a new (sub)category."""
    if data.parent_category_id:
        parent = await db.get(Category, data.parent_category_id)
        if not parent:
            raise HTTPException(404, 'Parent category not found')

    category = Category(**data.model_dump(exclude_none=True))
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.get('/', response_model=List[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    """List all active categories."""
    result = await db.execute(select(Category).where(Category.is_active == True).order_by(Category.name))
    return result.scalars().all()


@router.get('/{category_id}', response_model=CategoryResponse)
async def get_category(category_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single category by ID."""
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(404, 'Category not found')
    return category


@router.delete('/{category_id}', status_code=204)
async def delete_category(
    category_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin only: delete a category."""
    category = await db.get(Category, category_id)
    if not category:
        raise HTTPException(404, 'Category not found')
        
    category.is_active = False
    await db.commit()

# ─── END SECTION: Category CRUD ───────────────────────────────────────────────

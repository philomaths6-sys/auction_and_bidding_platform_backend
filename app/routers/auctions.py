from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.models.auction import Auction, AuctionImage, AuctionAttribute, Category
from app.models.admin import AuctionView, Report
from app.models.transaction import AuctionWinner
from app.schemas.auction import (
    AuctionCreate, AuctionUpdate, AuctionResponse,
    AuctionImageCreate, AuctionImageResponse,
    AuctionAttributeCreate, AuctionAttributeResponse,
    AuctionStatusUpdate, AuctionWinnerResponse, HomeFeedResponse,
)
from app.dependencies import get_current_user, get_optional_user
from app.models.user import User
from app.utils.redis_client import get_redis


router = APIRouter(prefix='/auctions', tags=['Auctions'])
FEATURED_AUCTIONS_KEY = 'home:featured:auction_ids'


async def _load_auction_for_response(db: AsyncSession, auction_id: int) -> Auction | None:
    """Eager-load seller + children so AuctionResponse serializes without lazy IO."""
    r = await db.execute(
        select(Auction)
        .options(
            selectinload(Auction.seller),
            selectinload(Auction.images),
            selectinload(Auction.attributes),
        )
        .where(Auction.id == auction_id)
    )
    return r.scalar_one_or_none()


@router.post('/', response_model=AuctionResponse, status_code=201)
async def create_auction(
    data: AuctionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from datetime import datetime, timezone
    start = data.start_time or datetime.now(timezone.utc)
    
    if data.end_time <= start:
        raise HTTPException(400, 'end_time must be after start_time')
        
    # Check if category exists and is active
    category = await db.get(Category, data.category_id)
    if not category or not category.is_active:
        raise HTTPException(400, f'Category {data.category_id} does not exist or is disabled')
    
    dump = data.model_dump(exclude_none=True)
    dump['start_time'] = start
        
    auction = Auction(
        **dump,
        seller_id=current_user.id,
        current_price=data.starting_price
    )
    db.add(auction)
    await db.commit()
    await db.refresh(auction)
    loaded = await _load_auction_for_response(db, auction.id)
    if not loaded:
        raise HTTPException(500, 'Auction created but could not be reloaded')
    return loaded


@router.get('/', response_model=List[AuctionResponse])
async def list_auctions(
    status: str | None = None,
    category_id: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    skip: int = 0, limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    q = select(Auction).options(
        selectinload(Auction.seller),
        selectinload(Auction.images),
        selectinload(Auction.attributes),
        selectinload(Auction.category),
    )
    if status:      q = q.where(Auction.auction_status == status)
    if category_id: q = q.where(Auction.category_id == category_id)
    if min_price is not None: q = q.where(Auction.current_price >= min_price)
    if max_price is not None: q = q.where(Auction.current_price <= max_price)
    result = await db.execute(q.order_by(Auction.created_at.desc()).offset(skip).limit(limit))
    auctions = result.scalars().all()
    
    # Handle deleted categories by setting category_name to None
    for auction in auctions:
        if auction.category and not auction.category.is_active:
            auction.category_name = None
        elif auction.category:
            auction.category_name = auction.category.name
        else:
            auction.category_name = None
    
    return auctions


@router.get('/home-feed', response_model=HomeFeedResponse)
async def get_home_feed(
    featured_limit: int = 3,
    latest_limit: int = 8,
    db: AsyncSession = Depends(get_db),
):
    redis = await get_redis()
    raw_ids = await redis.lrange(FEATURED_AUCTIONS_KEY, 0, max(0, featured_limit - 1))
    featured_ids = [int(v) for v in raw_ids if str(v).isdigit()]

    featured_map: dict[int, Auction] = {}
    if featured_ids:
        fr = await db.execute(
            select(Auction)
            .options(
                selectinload(Auction.seller),
                selectinload(Auction.images),
                selectinload(Auction.attributes),
                selectinload(Auction.category),
            )
            .where(Auction.id.in_(featured_ids), Auction.auction_status == 'active')
        )
        featured_auctions = fr.scalars().all()
        for auction in featured_auctions:
            if auction.category and not auction.category.is_active:
                auction.category_name = None
            elif auction.category:
                auction.category_name = auction.category.name
            else:
                auction.category_name = None
        featured_map = {a.id: a for a in featured_auctions}

    featured = [featured_map[i] for i in featured_ids if i in featured_map]
    excluded = [a.id for a in featured]

    q = (
        select(Auction)
        .options(
            selectinload(Auction.seller),
            selectinload(Auction.images),
            selectinload(Auction.attributes),
            selectinload(Auction.category),
        )
        .where(Auction.auction_status == 'active')
        .order_by(Auction.created_at.desc())
        .limit(max(0, latest_limit + len(excluded)))
    )
    if excluded:
        q = q.where(~Auction.id.in_(excluded))

    lr = await db.execute(q)
    latest_auctions = lr.scalars().all()[: max(0, latest_limit)]
    
    # Handle deleted categories for latest auctions
    for auction in latest_auctions:
        if auction.category and not auction.category.is_active:
            auction.category_name = None
        elif auction.category:
            auction.category_name = auction.category.name
        else:
            auction.category_name = None
    
    return {'featured': featured, 'latest': latest_auctions}


# ─── SECTION: Search Auctions (NEW) ──────────────────────────────────────────

@router.get('/search', response_model=List[AuctionResponse])
async def search_auctions(
    q: str,
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    """Full-text keyword search on auction title and description."""
    from sqlalchemy import or_
    result = await db.execute(
        select(Auction)
        .options(
            selectinload(Auction.seller),
            selectinload(Auction.images),
            selectinload(Auction.attributes),
            selectinload(Auction.category),
        )
        .where(
            Auction.auction_status == 'active',
            or_(
                Auction.title.ilike(f'%{q}%'),
                Auction.description.ilike(f'%{q}%')
            )
        )
        .order_by(Auction.end_time.asc())
        .offset(skip).limit(limit)
    )
    auctions = result.scalars().all()
    
    # Handle deleted categories
    for auction in auctions:
        if auction.category and not auction.category.is_active:
            auction.category_name = None
        elif auction.category:
            auction.category_name = auction.category.name
        else:
            auction.category_name = None
    
    return auctions

# ─── END SECTION: Search Auctions ────────────────────────────────────────────


# ─── SECTION: Seller's Own Auctions (NEW) ────────────────────────────────────

@router.get('/my', response_model=List[AuctionResponse])
async def my_auctions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns all auctions created by the current user."""
    result = await db.execute(
        select(Auction)
        .options(
            selectinload(Auction.seller),
            selectinload(Auction.images),
            selectinload(Auction.attributes),
            selectinload(Auction.category),
        )
        .where(Auction.seller_id == current_user.id)
        .order_by(Auction.created_at.desc())
    )
    auctions = result.scalars().all()
    
    # Handle deleted categories
    for auction in auctions:
        if auction.category and not auction.category.is_active:
            auction.category_name = None
        elif auction.category:
            auction.category_name = auction.category.name
        else:
            auction.category_name = None
    
    return auctions

# ─── END SECTION: Seller's Own Auctions ──────────────────────────────────────


@router.get('/{auction_id}', response_model=AuctionResponse)
async def get_auction(
    auction_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user)
):
    result = await db.execute(
        select(Auction)
        .options(
            selectinload(Auction.seller),
            selectinload(Auction.images),
            selectinload(Auction.attributes),
            selectinload(Auction.category),
        )
        .where(Auction.id == auction_id)
    )
    auction = result.scalar_one_or_none()
    if not auction: raise HTTPException(404, 'Auction not found')
    
    # Handle deleted category
    if auction.category and not auction.category.is_active:
        auction.category_name = None
    elif auction.category:
        auction.category_name = auction.category.name
    else:
        auction.category_name = None
    db.add(AuctionView(
        auction_id=auction_id,
        user_id=current_user.id if current_user else None,
        ip_address=request.client.host
    ))
    auction.total_views += 1
    await db.commit()
    loaded = await _load_auction_for_response(db, auction_id)
    if not loaded:
        raise HTTPException(500, 'Auction updated but could not be reloaded')
    return loaded


# ─── SECTION: Update Auction (NEW) ───────────────────────────────────────────

@router.patch('/{auction_id}', response_model=AuctionResponse)
async def update_auction(
    auction_id: int,
    data: AuctionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Seller can update their auction while it is in draft status."""
    result = await db.execute(
        select(Auction)
        .options(
            selectinload(Auction.seller),
            selectinload(Auction.images),
            selectinload(Auction.attributes),
        )
        .where(Auction.id == auction_id)
    )
    auction = result.scalar_one_or_none()
    if not auction or auction.seller_id != current_user.id:
        raise HTTPException(403, 'Not authorised')
    if auction.auction_status not in ('draft',):
        raise HTTPException(400, 'Only draft auctions can be edited')
        
    if data.category_id is not None:
        category = await db.get(Category, data.category_id)
        if not category or not category.is_active:
            raise HTTPException(400, f'Category {data.category_id} does not exist or is disabled')
            
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(auction, field, value)
    await db.commit()
    loaded = await _load_auction_for_response(db, auction_id)
    if not loaded:
        raise HTTPException(500, 'Auction updated but could not be reloaded')
    return loaded

# ─── END SECTION: Update Auction ─────────────────────────────────────────────


@router.delete('/{auction_id}', status_code=204)
async def delete_auction(
    auction_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    auction = await db.get(Auction, auction_id)
    if not auction:
        raise HTTPException(404, 'Auction not found')

    # Never allow deleting active auctions (even admin)
    if auction.auction_status == 'active':
        raise HTTPException(400, 'Cannot delete an active auction')

    # Admin can delete any non-active auction; sellers can delete their own non-active auctions
    if current_user.role != 'admin' and auction.seller_id != current_user.id:
        raise HTTPException(403, 'Not authorised')
    await db.delete(auction)
    await db.commit()


# ─── SECTION: Auction Images (NEW) ───────────────────────────────────────────

@router.post('/{auction_id}/images', response_model=AuctionImageResponse, status_code=201)
async def add_auction_image(
    auction_id: int,
    data: AuctionImageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Seller adds an image URL to their auction."""
    auction = await db.get(Auction, auction_id)
    if not auction or auction.seller_id != current_user.id:
        raise HTTPException(403, 'Not authorised')
    image = AuctionImage(auction_id=auction_id, **data.model_dump())
    db.add(image)
    await db.commit()
    await db.refresh(image)
    return image


@router.delete('/{auction_id}/images/{image_id}', status_code=204)
async def delete_auction_image(
    auction_id: int,
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Seller removes one of their auction images."""
    auction = await db.get(Auction, auction_id)
    if not auction or auction.seller_id != current_user.id:
        raise HTTPException(403, 'Not authorised')
    image = await db.get(AuctionImage, image_id)
    if not image or image.auction_id != auction_id:
        raise HTTPException(404, 'Image not found')
    await db.delete(image)
    await db.commit()

# ─── END SECTION: Auction Images ─────────────────────────────────────────────


# ─── SECTION: Auction Attributes (NEW) ───────────────────────────────────────

@router.post('/{auction_id}/attributes', response_model=AuctionAttributeResponse, status_code=201)
async def add_auction_attribute(
    auction_id: int,
    data: AuctionAttributeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Seller adds a custom attribute (e.g. brand, colour) to their auction."""
    auction = await db.get(Auction, auction_id)
    if not auction or auction.seller_id != current_user.id:
        raise HTTPException(403, 'Not authorised')
    attr = AuctionAttribute(auction_id=auction_id, **data.model_dump())
    db.add(attr)
    await db.commit()
    await db.refresh(attr)
    return attr


@router.delete('/{auction_id}/attributes/{attribute_id}', status_code=204)
async def delete_auction_attribute(
    auction_id: int,
    attribute_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Seller removes an attribute from their auction."""
    auction = await db.get(Auction, auction_id)
    if not auction or auction.seller_id != current_user.id:
        raise HTTPException(403, 'Not authorised')
    attr = await db.get(AuctionAttribute, attribute_id)
    if not attr or attr.auction_id != auction_id:
        raise HTTPException(404, 'Attribute not found')
    await db.delete(attr)
    await db.commit()

# ─── END SECTION: Auction Attributes ─────────────────────────────────────────


# ─── SECTION: Report Auction (NEW) ───────────────────────────────────────────

@router.post('/{auction_id}/report', status_code=201)
async def report_auction(
    auction_id: int,
    reason: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Any logged-in user can file a report on a suspicious auction."""
    auction = await db.get(Auction, auction_id)
    if not auction:
        raise HTTPException(404, 'Auction not found')
    report = Report(
        auction_id=auction_id,
        reported_by=current_user.id,
        reason=reason,
        status='open'
    )
    db.add(report)
    await db.commit()
    return {'message': 'Report submitted successfully'}

# ─── END SECTION: Report Auction ─────────────────────────────────────────────


# ─── SECTION: Auction Status Management (NEW) ────────────────────────────────

ALLOWED_TRANSITIONS = {
    'draft':  ['active', 'cancelled'],
    'active': ['cancelled'],
}

@router.patch('/{auction_id}/status')
async def change_auction_status(
    auction_id: int,
    data: AuctionStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Seller activates or cancels their auction.
    Transitions: draft → active, active → cancelled."""
    auction = await db.get(Auction, auction_id)
    if not auction or auction.seller_id != current_user.id:
        raise HTTPException(403, 'Not authorised')
    allowed = ALLOWED_TRANSITIONS.get(auction.auction_status, [])
    if data.status not in allowed:
        raise HTTPException(400, f"Cannot transition from '{auction.auction_status}' to '{data.status}'")
    auction.auction_status = data.status
    await db.commit()
    return {'auction_id': auction_id, 'status': data.status}

# ─── END SECTION: Auction Status Management ───────────────────────────────────


# ─── SECTION: Manual Auction Closing (for testing) ───────────────────────────

@router.post('/close-ended-auctions')
async def manual_close_ended_auctions(current_user: User = Depends(get_current_user)):
    """Manually trigger the closing of ended auctions (admin only for testing)."""
    if current_user.role != 'admin':
        raise HTTPException(403, 'Admin access required')
    
    from app.services.auction_service import close_ended_auctions
    await close_ended_auctions()
    return {'message': 'Ended auctions processed successfully'}

# ─── END SECTION: Manual Auction Closing ───────────────────────────────────────


# ─── SECTION: Auction Winner (NEW) ───────────────────────────────────────────

@router.get('/{auction_id}/winner', response_model=AuctionWinnerResponse)
async def get_auction_winner(auction_id: int, db: AsyncSession = Depends(get_db)):
    """Returns the winner of an ended auction. Public endpoint."""
    auction = await db.get(Auction, auction_id)
    if not auction:
        raise HTTPException(404, 'Auction not found')
    if auction.auction_status != 'ended':
        raise HTTPException(400, 'Auction has not ended yet')
    result = await db.execute(
        select(AuctionWinner).where(AuctionWinner.auction_id == auction_id)
    )
    winner = result.scalar_one_or_none()
    if not winner:
        raise HTTPException(404, 'No winner found (auction ended with no bids)')
    return winner

# ─── END SECTION: Auction Winner ─────────────────────────────────────────────


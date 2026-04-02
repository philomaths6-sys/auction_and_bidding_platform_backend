from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.auction import Auction
from app.models.user import User
from app.models.admin import AdminLog, FraudFlag, Report
from app.schemas.admin import (
    ReportResponse,
    ReportDetailResponse,
    FraudFlagResponse,
    AdminLogResponse,
    FeaturedAuctionsUpdateRequest,
)
from app.schemas.user import AdminPromoteRequest, UserResponse
from app.dependencies import require_admin
from app.utils.redis_client import get_redis


router = APIRouter(prefix='/admin', tags=['Admin'])
FEATURED_AUCTIONS_KEY = 'home:featured:auction_ids'


@router.get('/users', response_model=List[UserResponse])
async def list_all_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin only: list all registered users."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


async def log_action(admin_id: int, action: str, target_type: str, target_id: int, db: AsyncSession):
    db.add(AdminLog(admin_id=admin_id, action=action, target_type=target_type, target_id=target_id))


@router.get('/reports', response_model=List[ReportDetailResponse])
async def list_reports(
    status: str = 'open',
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Report).where(Report.status == status).order_by(Report.created_at.desc())
    )
    reports = result.scalars().all()
    if not reports:
        return []

    user_ids = {r.reported_by for r in reports}
    auction_ids = {r.auction_id for r in reports}

    ur = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = {u.id: u.username for u in ur.scalars().all()}

    ar = await db.execute(select(Auction.id, Auction.title).where(Auction.id.in_(auction_ids)))
    titles = {row[0]: row[1] for row in ar.all()}

    out: list[ReportDetailResponse] = []
    for r in reports:
        out.append(
            ReportDetailResponse(
                id=r.id,
                auction_id=r.auction_id,
                reported_by=r.reported_by,
                reason=r.reason,
                status=r.status,
                created_at=r.created_at,
                reporter_username=users.get(r.reported_by),
                auction_title=titles.get(r.auction_id),
            )
        )
    return out


@router.patch('/reports/{report_id}')
async def update_report(
    report_id: int,
    status: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, 'Not found')
    report.status = status
    await log_action(admin.id, f'update_report:{status}', 'report', report_id, db)
    await db.commit()
    return {'status': status}


@router.delete('/reports/{report_id}', status_code=204)
async def delete_report(
    report_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, 'Not found')
    await db.delete(report)
    await log_action(admin.id, 'delete_report', 'report', report_id, db)
    await db.commit()


@router.post('/reports/{report_id}/cancel-auction')
async def cancel_reported_auction(
    report_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin: cancel an active auction tied to a report."""
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(404, 'Report not found')
    auction = await db.get(Auction, report.auction_id)
    if not auction:
        raise HTTPException(404, 'Auction not found')
    if auction.auction_status != 'active':
        raise HTTPException(400, 'Only active auctions can be cancelled this way')
    auction.auction_status = 'cancelled'
    report.status = 'closed'
    await log_action(admin.id, 'admin_cancel_auction_from_report', 'auction', auction.id, db)
    await db.commit()
    return {'auction_id': auction.id, 'auction_status': auction.auction_status, 'report_status': report.status}


@router.get('/fraud-flags', response_model=List[FraudFlagResponse])
async def list_fraud_flags(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(FraudFlag).order_by(FraudFlag.flagged_at.desc()))
    return result.scalars().all()


@router.get('/logs', response_model=List[AdminLogResponse])
async def get_logs(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(AdminLog).order_by(AdminLog.created_at.desc()).limit(200)
    )
    return result.scalars().all()


@router.delete('/users/{identifier}')
async def ban_user(
    identifier: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy.future import select
    if identifier.isdigit():
        user = await db.get(User, int(identifier))
    else:
        result = await db.execute(select(User).where(User.username == identifier))
        user = result.scalars().first()

    if not user:
        raise HTTPException(404, 'User not found')
        
    user.role = 'banned'
    await log_action(admin.id, 'ban_user', 'user', user.id, db)
    await db.commit()
    return {'message': f'User {user.username} banned'}


# ─── SECTION: Promote Admin (NEW) ────────────────────────────────────────────

@router.post('/promote-admin', response_model=UserResponse)
async def promote_to_admin(
    data: AdminPromoteRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin only: promote a regular user to the admin role."""
    user = await db.get(User, data.user_id)
    if not user:
        raise HTTPException(404, 'User not found')
    if user.role == 'banned':
        raise HTTPException(400, 'Cannot promote a banned user')
    if user.role == 'admin':
        raise HTTPException(400, 'User is already an admin')
    user.role = 'admin'
    await log_action(admin.id, 'promote_to_admin', 'user', data.user_id, db)
    await db.commit()
    await db.refresh(user)
    return user

# ─── END SECTION: Promote Admin ───────────────────────────────────────────────


@router.get('/featured-auctions', response_model=List[int])
async def get_featured_auctions(
    admin: User = Depends(require_admin),
):
    redis = await get_redis()
    raw_ids = await redis.lrange(FEATURED_AUCTIONS_KEY, 0, -1)
    return [int(v) for v in raw_ids if str(v).isdigit()]


@router.put('/featured-auctions', response_model=List[int])
async def set_featured_auctions(
    payload: FeaturedAuctionsUpdateRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    # keep insertion order, remove duplicates
    deduped = list(dict.fromkeys(payload.auction_ids))
    if not deduped:
        redis = await get_redis()
        await redis.delete(FEATURED_AUCTIONS_KEY)
        await log_action(admin.id, 'set_featured_auctions:clear', 'auction', 0, db)
        await db.commit()
        return []

    result = await db.execute(select(Auction.id).where(Auction.id.in_(deduped)))
    existing = {row[0] for row in result.all()}
    valid_ids = [i for i in deduped if i in existing]

    redis = await get_redis()
    await redis.delete(FEATURED_AUCTIONS_KEY)
    if valid_ids:
        await redis.rpush(FEATURED_AUCTIONS_KEY, *valid_ids)

    await log_action(admin.id, 'set_featured_auctions', 'auction', valid_ids[0] if valid_ids else 0, db)
    await db.commit()
    return valid_ids
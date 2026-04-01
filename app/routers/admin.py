from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.admin import AdminLog, FraudFlag, Report
from app.schemas.admin import ReportResponse, FraudFlagResponse, AdminLogResponse
from app.schemas.user import AdminPromoteRequest, UserResponse
from app.dependencies import require_admin


router = APIRouter(prefix='/admin', tags=['Admin'])


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


@router.get('/reports', response_model=List[ReportResponse])
async def list_reports(
    status: str = 'open',
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Report).where(Report.status == status).order_by(Report.created_at.desc())
    )
    return result.scalars().all()


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
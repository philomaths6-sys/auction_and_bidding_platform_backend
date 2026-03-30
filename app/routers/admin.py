from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.admin import AdminLog, FraudFlag, Report
from app.schemas.admin import ReportResponse, FraudFlagResponse, AdminLogResponse
from app.dependencies import get_current_user, require_admin

router = APIRouter(prefix='/admin', tags=['Admin'])


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


@router.delete('/users/{user_id}')
async def ban_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, 'User not found')
    user.role = 'banned'
    await log_action(admin.id, 'ban_user', 'user', user_id, db)
    await db.commit()
    return {'message': f'User {user_id} banned'}
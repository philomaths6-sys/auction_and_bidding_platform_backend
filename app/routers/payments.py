import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.auction import Auction
from app.models.transaction import Payment, AuctionWinner
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.dependencies import get_current_user

router = APIRouter(prefix='/payments', tags=['Payments'])


@router.post('/', response_model=PaymentResponse, status_code=201)
async def create_payment(
    data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    winner = await db.execute(select(AuctionWinner).where(
        AuctionWinner.auction_id == data.auction_id,
        AuctionWinner.winner_user_id == current_user.id
    ))
    if not winner.scalar_one_or_none():
        raise HTTPException(status.HTTP_403_FORBIDDEN, 'You did not win this auction')

    auction = await db.get(Auction, data.auction_id)
    if not auction:
        raise HTTPException(status.HTTP_404_NOT_FOUND, 'Auction not found')

    payment = Payment(
        auction_id=data.auction_id,
        buyer_id=current_user.id,
        seller_id=auction.seller_id,
        amount=auction.current_price,
        payment_method=data.payment_method,
        payment_status='completed',
        transaction_id=str(uuid.uuid4())
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


# ─── SECTION: Payment History (NEW) ──────────────────────────────────────────

@router.get('/', response_model=list[PaymentResponse])
async def my_payments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns all payments made or received by the current user."""
    from sqlalchemy import or_
    result = await db.execute(
        select(Payment)
        .where(or_(
            Payment.buyer_id == current_user.id,
            Payment.seller_id == current_user.id
        ))
        .order_by(Payment.created_at.desc())
    )
    return result.scalars().all()


@router.get('/{payment_id}', response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific payment by ID. Only visible to buyer or seller."""
    payment = await db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(404, 'Payment not found')
    if payment.buyer_id != current_user.id and payment.seller_id != current_user.id:
        raise HTTPException(403, 'Not authorised')
    return payment

# ─── END SECTION: Payment History ────────────────────────────────────────────
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
    auction = await db.get(Auction, payment.auction_id)
    return PaymentResponse(
        id=payment.id,
        auction_id=payment.auction_id,
        buyer_id=payment.buyer_id,
        seller_id=payment.seller_id,
        amount=payment.amount,
        payment_status=payment.payment_status,
        payment_method=payment.payment_method,
        transaction_id=payment.transaction_id,
        created_at=payment.created_at,
        auction_title=auction.title if auction else None,
    )


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
    payments = result.scalars().all()
    if not payments:
        return []
    auction_ids = [p.auction_id for p in payments]
    ar = await db.execute(select(Auction.id, Auction.title).where(Auction.id.in_(auction_ids)))
    title_map = {row[0]: row[1] for row in ar.all()}
    return [
        PaymentResponse(
            id=p.id,
            auction_id=p.auction_id,
            buyer_id=p.buyer_id,
            seller_id=p.seller_id,
            amount=p.amount,
            payment_status=p.payment_status,
            payment_method=p.payment_method,
            transaction_id=p.transaction_id,
            created_at=p.created_at,
            auction_title=title_map.get(p.auction_id),
        )
        for p in payments
    ]


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
    auction = await db.get(Auction, payment.auction_id)
    return PaymentResponse(
        id=payment.id,
        auction_id=payment.auction_id,
        buyer_id=payment.buyer_id,
        seller_id=payment.seller_id,
        amount=payment.amount,
        payment_status=payment.payment_status,
        payment_method=payment.payment_method,
        transaction_id=payment.transaction_id,
        created_at=payment.created_at,
        auction_title=auction.title if auction else None,
    )

# ─── END SECTION: Payment History ────────────────────────────────────────────
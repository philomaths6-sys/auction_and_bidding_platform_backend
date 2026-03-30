from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from .user import TABLE_ARGS


class AuctionWinner(Base):
    __tablename__ = 'auction_winners'
    __table_args__ = TABLE_ARGS
 
    id             = Column(Integer, primary_key=True, autoincrement=True)
    auction_id     = Column(Integer, ForeignKey('auctions.id'), unique=True)
    winner_user_id = Column(Integer, ForeignKey('users.id'))
    winning_bid_id = Column(Integer, ForeignKey('bids.id'))
    winning_amount = Column(Numeric(12, 2))
    won_at         = Column(DateTime(timezone=True), server_default=func.now())
 
class Payment(Base):
    __tablename__ = 'payments'
    __table_args__ = TABLE_ARGS
 
    id             = Column(Integer, primary_key=True, autoincrement=True)
    auction_id     = Column(Integer, ForeignKey('auctions.id'), unique=True)
    buyer_id       = Column(Integer, ForeignKey('users.id'))
    seller_id      = Column(Integer, ForeignKey('users.id'))
    amount         = Column(Numeric(12, 2), nullable=False)
    payment_status = Column(String(20), default='pending')
    payment_method = Column(String(50))
    transaction_id = Column(String(191), unique=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
 
class SellerRating(Base):
    __tablename__ = 'seller_ratings'
    __table_args__ = TABLE_ARGS
    id         = Column(Integer, primary_key=True, autoincrement=True)
    seller_id  = Column(Integer, ForeignKey('users.id'))
    buyer_id   = Column(Integer, ForeignKey('users.id'))
    rating     = Column(Integer, nullable=False)   # 1-5
    review     = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

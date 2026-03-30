from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from .user import TABLE_ARGS
 

class Bid(Base):
    __tablename__ = 'bids'
    __table_args__ = TABLE_ARGS
 
    id             = Column(Integer, primary_key=True, autoincrement=True)
    auction_id     = Column(Integer, ForeignKey('auctions.id', ondelete='CASCADE'))
    bidder_id      = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    bid_amount     = Column(Numeric(12, 2), nullable=False)
    bid_time       = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    is_winning_bid = Column(Boolean, default=False)
 
    auction = relationship('Auction', back_populates='bids')
    bidder  = relationship('User', back_populates='bids')
 
class BidHistory(Base):
    __tablename__ = 'bid_history'
    __table_args__ = TABLE_ARGS
 
    id             = Column(Integer, primary_key=True, autoincrement=True)
    auction_id     = Column(Integer, ForeignKey('auctions.id'))
    bid_id         = Column(Integer, ForeignKey('bids.id'))
    previous_price = Column(Numeric(12, 2))
    new_price      = Column(Numeric(12, 2))
    timestamp      = Column(DateTime, default=datetime.utcnow)
 
class AuctionExtension(Base):
    __tablename__ = 'auction_extensions'
    __table_args__ = TABLE_ARGS
 
    id               = Column(Integer, primary_key=True, autoincrement=True)
    auction_id       = Column(Integer, ForeignKey('auctions.id'))
    extended_seconds = Column(Integer, nullable=False)
    triggered_by_bid = Column(Integer, ForeignKey('bids.id'), nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())


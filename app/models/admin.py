

from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base
from .user import TABLE_ARGS


class AuctionView(Base):
    __tablename__ = 'auction_views'
    __table_args__ = TABLE_ARGS

    id         = Column(Integer, primary_key=True, autoincrement=True)
    auction_id = Column(Integer, ForeignKey('auctions.id', ondelete='CASCADE'))
    user_id    = Column(Integer, ForeignKey('users.id'), nullable=True)
    viewed_at  = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    ip_address = Column(String(50))

class FraudFlag(Base):
    __tablename__ = 'fraud_flags'
    __table_args__ = TABLE_ARGS

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey('users.id'))
    auction_id = Column(Integer, ForeignKey('auctions.id'))
    reason     = Column(Text)
    flagged_at = Column(DateTime(timezone=True), server_default=func.now())

class Report(Base):
    __tablename__ = 'reports'
    __table_args__ = TABLE_ARGS

    id          = Column(Integer, primary_key=True, autoincrement=True)
    auction_id  = Column(Integer, ForeignKey('auctions.id'))
    reported_by = Column(Integer, ForeignKey('users.id'))
    reason      = Column(Text)
    status      = Column(String(20), default='open')  # open | reviewed | closed
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

class AdminLog(Base):
    __tablename__ = 'admin_logs'
    __table_args__ = TABLE_ARGS

    id          = Column(Integer, primary_key=True, autoincrement=True)
    admin_id    = Column(Integer, ForeignKey('users.id'))
    action      = Column(String(255), nullable=False)
    target_type = Column(String(50))
    target_id   = Column(Integer)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
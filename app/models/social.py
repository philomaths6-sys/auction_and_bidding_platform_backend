from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from .user import TABLE_ARGS

class Comment(Base):
    __tablename__ = 'comments'
    __table_args__ = TABLE_ARGS

    id                = Column(Integer, primary_key=True, autoincrement=True)
    auction_id        = Column(Integer, ForeignKey('auctions.id', ondelete='CASCADE'))
    user_id           = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    comment_text      = Column(Text, nullable=False)
    parent_comment_id = Column(Integer, ForeignKey('comments.id'), nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

    replies = relationship('Comment', back_populates='parent')
    parent  = relationship('Comment', back_populates='replies',
                           remote_side='Comment.id')

class Watchlist(Base):
    __tablename__ = 'watchlists'
    __table_args__ = TABLE_ARGS

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    auction_id = Column(Integer, ForeignKey('auctions.id', ondelete='CASCADE'))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    __tablename__ = 'notifications'
    __table_args__ = TABLE_ARGS

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    type       = Column(String(50))  # bid_placed | outbid | won | payment_due
    message    = Column(Text)
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
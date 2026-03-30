from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
 
TABLE_ARGS = {
    'mysql_engine': 'InnoDB',
    'mysql_charset': 'utf8mb4',
    'mysql_collate': 'utf8mb4_unicode_ci'
}
 
class User(Base):
    __tablename__ = 'users'
    __table_args__ = TABLE_ARGS
 
    id            = Column(Integer, primary_key=True, autoincrement=True)
    username      = Column(String(50), unique=True, nullable=False, index=True)
    email         = Column(String(191), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    phone         = Column(String(20))
    role          = Column(String(20), default='user')   # user | admin | banned
    is_verified   = Column(Boolean, default=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True),server_default=func.now(), onupdate=func.now())
 
    profile = relationship('UserProfile', back_populates='user', uselist=False, lazy='selectin')
    auctions = relationship('Auction', back_populates='seller')
    bids     = relationship('Bid', back_populates='bidder')
 
class UserProfile(Base):
    __tablename__ = 'user_profiles'
    __table_args__ = TABLE_ARGS
 
    id            = Column(Integer, primary_key=True, autoincrement=True)
    user_id       = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), unique=True)
    full_name     = Column(String(100))
    address       = Column(Text)
    city          = Column(String(100))
    country       = Column(String(100))
    profile_image = Column(String(500))
    bio           = Column(Text)
 
    user = relationship('User', back_populates='profile')

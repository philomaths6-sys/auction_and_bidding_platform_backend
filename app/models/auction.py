from sqlalchemy import Column, Integer, String, Text, Numeric, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from .user import TABLE_ARGS
 
class Category(Base):
    __tablename__ = 'categories'
    __table_args__ = TABLE_ARGS
 
    id                 = Column(Integer, primary_key=True, autoincrement=True)
    name               = Column(String(100), nullable=False)
    description        = Column(Text)
    parent_category_id = Column(Integer, ForeignKey('categories.id'), nullable=True)
    is_active          = Column(Boolean, default=True)
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
 
    subcategories = relationship('Category', back_populates='parent')
    parent        = relationship('Category', back_populates='subcategories',
                                 remote_side='Category.id')
    auctions      = relationship('Auction', back_populates='category', cascade='all, delete-orphan')
 
class Auction(Base):
    __tablename__ = 'auctions'
    __table_args__ = TABLE_ARGS
 
    id             = Column(Integer, primary_key=True, autoincrement=True, index=True)
    title          = Column(String(255), nullable=False)
    description    = Column(Text)
    seller_id      = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    category_id    = Column(Integer, ForeignKey('categories.id', ondelete='SET NULL'))
    starting_price = Column(Numeric(12, 2), nullable=False)
    reserve_price  = Column(Numeric(12, 2))
    current_price  = Column(Numeric(12, 2), nullable=False)
    auction_status = Column(String(20), default='draft')
                   # draft | active | ended | cancelled
    start_time     = Column(DateTime(timezone=True), nullable=False)
    end_time       = Column(DateTime(timezone=True), nullable=False, index=True)
    total_bids     = Column(Integer, default=0)
    total_views    = Column(Integer, default=0)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
 
    seller     = relationship('User', back_populates='auctions')
    category   = relationship('Category')

    @property
    def seller_username(self) -> str | None:
        u = self.seller
        return u.username if u is not None else None
    images     = relationship('AuctionImage', back_populates='auction', lazy='selectin')
    attributes = relationship('AuctionAttribute', back_populates='auction', lazy='selectin')
    bids       = relationship('Bid', back_populates='auction')
 
class AuctionImage(Base):
    __tablename__ = 'auction_images'
    __table_args__ = TABLE_ARGS
 
    id          = Column(Integer, primary_key=True, autoincrement=True)
    auction_id  = Column(Integer, ForeignKey('auctions.id', ondelete='CASCADE'))
    image_url   = Column(String(500), nullable=False)
    is_primary  = Column(Boolean, default=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    auction     = relationship('Auction', back_populates='images')
 
class AuctionAttribute(Base):
    __tablename__ = 'auction_attributes'
    __table_args__ = TABLE_ARGS
 
    id              = Column(Integer, primary_key=True, autoincrement=True)
    auction_id      = Column(Integer, ForeignKey('auctions.id', ondelete='CASCADE'))
    attribute_name  = Column(String(100), nullable=False)
    attribute_value = Column(String(500))
    auction         = relationship('Auction', back_populates='attributes')


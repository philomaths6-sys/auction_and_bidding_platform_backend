import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, Heart } from 'lucide-react';
import { watchlistService } from '../services/api/watchlistService';

function safeEndDate(endTime) {
  if (endTime == null || endTime === '') return null;
  const d = new Date(endTime);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTimeRemaining(endTime) {
  if (!endTime) return '—';
  
  const now = new Date();
  const end = new Date(endTime);
  const diffMs = end - now;
  
  if (diffMs <= 0) return 'Time Up';
  
  const days = Math.floor(diffMs / (24 * 3600000));
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor(diffMs / 60000);
  const s = Math.floor(diffMs / 1000);
  
  if (days > 0) {
    return `${days}d`;
  } else if (h > 0) {
    return `${h}h`;
  } else if (m > 0) {
    return `${m}m`;
  } else {
    return `${s}s`;
  }
}

export default function AuctionCard({ auction, initialWatchlisted = false, variant = 'default' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isWatchlisted, setIsWatchlisted] = useState(initialWatchlisted);
  const [imageLoaded, setImageLoaded] = useState(false);
  const views = Number(auction.total_views);
  const viewLabel = Number.isFinite(views) ? views.toLocaleString() : '0';

  const endDate = safeEndDate(auction.end_time);
  const isEnded = auction.auction_status === 'ended';
  const coverImage = auction.images?.find(img => img.is_primary)?.image_url 
    || auction.images?.[0]?.image_url 
    || 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80&w=800';

  const toggleWatchlist = async (e) => {
    e.preventDefault();
    if (!user) return alert('Please login to use the watchlist');
    try {
      if (isWatchlisted) {
        await watchlistService.removeFromWatchlist(auction.id);
        setIsWatchlisted(false);
      } else {
        await watchlistService.addToWatchlist(auction.id);
        setIsWatchlisted(true);
      }
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.detail === 'Already in watchlist') {
        setIsWatchlisted(true); 
      }
    }
  };

  const goAuction = () => navigate(`/auctions/${auction.id}`);
  const isFeatured = variant === 'featured';

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={goAuction}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goAuction();
        }
      }}
      className={`block group font-sans cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${isFeatured ? 'lg:col-span-full' : ''}`}
    >
      <div
        className={`glass rounded-lg hover:shadow-2xl overflow-hidden transition-all duration-350 ease-out transform group-hover:-translate-y-2 ${
          isFeatured ? 'md:flex md:items-stretch' : ''
        }`}
        style={{
          backdropFilter: 'blur(32px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderTop = '2px solid';
          e.currentTarget.style.borderImage = 'linear-gradient(90deg, #e8c040, transparent) 1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderTop = '';
          e.currentTarget.style.borderImage = '';
        }}
      >
        {/* Thumbnail Layer */}
        <div
          className={`relative bg-slate-900/30 overflow-hidden shrink-0 ${
            isFeatured ? 'h-56 md:h-auto md:w-1/2 md:min-h-[280px]' : 'h-56'
          }`}
        >
          {/* Shimmer Skeleton */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800/20 via-slate-700/20 to-slate-800/20 animate-pulse">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
            </div>
          )}
          <img 
            src={coverImage} 
            alt={auction.title}
            className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
          />
          <button 
            type="button"
            onClick={toggleWatchlist}
            className="absolute top-3 right-3 p-2 bg-slate-900/50 hover:bg-slate-900/80 backdrop-blur-sm rounded-full transition-colors z-10"
          >
            <Heart className={`w-5 h-5 ${isWatchlisted ? 'fill-amber-400 text-amber-400' : 'text-white/80'} hover:scale-110 transition-transform`} />
          </button>
          
          {isEnded && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white font-black text-2xl tracking-widest uppercase border-4 border-white px-4 py-2">Sold</span>
            </div>
          )}
        </div>
        
        {/* Info Layer */}
        <div
          className={`p-5 flex flex-col justify-between ${
            isFeatured ? 'md:w-1/2 md:min-h-[280px] md:py-5 md:px-5 h-auto' : 'h-auto min-h-[12rem]'
          }`}
          style={isFeatured ? { display: 'flex', flexDirection: 'column' } : {}}
        >
          <div>
            {/* CATEGORY BADGE */}
            {isFeatured && auction.category_name && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(245, 158, 11, 0.10)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '6px',
                padding: '3px 10px',
                width: 'fit-content',
                marginBottom: '10px'
              }}>
                <span style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  display: 'inline-block'
                }}></span>
                <span style={{
                  fontSize: '10px',
                  color: '#f59e0b',
                  fontWeight: '700',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase'
                }}>
                  {auction.category_name}
                </span>
              </div>
            )}
            
            {/* TITLE (unchanged) */}
            <h3
              className={`font-bold text-slate-100 leading-tight line-clamp-2 ${
                isFeatured ? 'text-lg md:text-xl' : 'text-lg'
              }`}
              style={{ letterSpacing: '0.8px' }}
            >
              {auction.title}
            </h3>
            
            {/* CATEGORY NAME FOR NON-FEATURED CARDS */}
            {!isFeatured && (
              <p className="text-sm font-medium text-slate-400 mt-2 tracking-wide">
                {auction.category_name || 'Uncategorized'}
              </p>
            )}
            
            {/* DESCRIPTION TEXT - expanded to 4 lines */}
            {isFeatured && auction.description && (
              <p className="text-slate-300 mt-2 text-sm leading-relaxed" style={{ 
                WebkitLineClamp: 4, 
                WebkitBoxOrient: 'vertical', 
                display: '-webkit-box', 
                overflow: 'hidden' 
              }}>
                {auction.description}
              </p>
            )}
            
            {/* META ROW (unchanged) */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" aria-hidden />
                {viewLabel} views
              </span>
              {auction.seller_id != null && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(`/seller/${auction.seller_id}`);
                  }}
                  className="text-indigo-400 hover:text-amber-400 normal-case font-semibold tracking-normal"
                >
                  @{auction.seller_username || `user${auction.seller_id}`}
                </button>
              )}
            </div>
          </div>
          
          {/* STATS ROW - fills the blank gap */}
          {isFeatured && (
            <div style={{
              display: 'flex',
              gap: '10px',
              marginTop: '14px'
            }}>
              {/* Starting Bid Box */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                flex: 1
              }}>
                <div style={{
                  fontSize: '9.5px',
                  color: 'rgba(255, 255, 255, 0.30)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                  fontWeight: '600'
                }}>
                  Starting Bid
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#f1f5f9',
                  fontWeight: '600'
                }}>
                  ${auction.current_price?.toLocaleString() || '0'}
                </div>
              </div>
              
              {/* Total Bids Box */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                flex: 1
              }}>
                <div style={{
                  fontSize: '9.5px',
                  color: 'rgba(255, 255, 255, 0.30)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                  fontWeight: '600'
                }}>
                  Total Bids
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#f1f5f9',
                  fontWeight: '600'
                }}>
                  {auction.total_bids || 0}
                </div>
              </div>
              
              {/* Watchers Box */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '10px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
                flex: 1
              }}>
                <div style={{
                  fontSize: '9.5px',
                  color: 'rgba(255, 255, 255, 0.30)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                  fontWeight: '600'
                }}>
                  Watchers
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#f1f5f9',
                  fontWeight: '600'
                }}>
                  {viewLabel}
                </div>
              </div>
            </div>
          )}
          
          {/* HORIZONTAL DIVIDER */}
          {isFeatured && (
            <div style={{
              height: '1px',
              background: 'rgba(255, 255, 255, 0.06)',
              margin: '16px 0',
              width: '100%'
            }}></div>
          )}
            
            {/* CURRENT BID AND TIMER FOR NON-FEATURED AUCTIONS */}
            {!isFeatured && (
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                    {isEnded ? 'Final Price' : 'Current Bid'}
                  </p>
                  <div className={`font-black text-slate-100 ${isFeatured ? 'text-2xl md:text-3xl' : 'text-2xl'}`} style={{ fontSize: isFeatured ? '28px' : '24px' }}>
                    ${auction.current_price?.toLocaleString() || '0'}
                  </div>
                </div>
                
                <div className={`font-bold tracking-tight px-3 py-1.5 rounded-lg ${
                  isEnded ? 'bg-slate-800 text-slate-400' 
                  : 'bg-green-900/40 text-green-400 flex items-center gap-1.5'
                }`}
                style={!isEnded ? { boxShadow: 'inset 0 0 8px rgba(77,216,128,0.15)' } : {}}
                >
                  {!isEnded && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
                  {!isEnded
                    ? endDate
                      ? formatTimeRemaining(auction.end_time)
                      : '—'
                    : 'Ended'}
                </div>
              </div>
            )}
            
            {/* CURRENT BID AND TIMER ABOVE PLACE BID FOR FEATURED */}
            {isFeatured && (
              <div>
                <div className="flex items-end justify-between" style={{ marginTop: '16px', marginLeft: '16px' }}>
                  <div>
                    <p className="text-slate-500 font-bold uppercase tracking-wider mb-1" style={{ fontSize: '14px' }}>
                      {isEnded ? 'Final Price' : 'Current Bid'}
                    </p>
                    <div className={`font-black text-slate-100 ${isFeatured ? 'text-2xl md:text-3xl' : 'text-2xl'}`} style={{ fontSize: isFeatured ? '40px' : '24px' }}>
                      ${auction.current_price?.toLocaleString() || '0'}
                    </div>
                  </div>
                  
                  <div className={`font-bold tracking-tight px-4 py-2 rounded-lg ${
                    isEnded ? 'bg-slate-800 text-slate-400' 
                    : 'bg-green-900/40 text-green-400 flex items-center gap-1.5'
                  }`}
                  style={{
                    ...(!isEnded ? { boxShadow: 'inset 0 0 8px rgba(77,216,128,0.15)' } : {}),
                    fontSize: '16px',
                    padding: '12px 16px'
                  }}
                  >
                    {!isEnded && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
                    {!isEnded
                      ? endDate
                        ? formatTimeRemaining(auction.end_time)
                        : '—'
                      : 'Ended'}
                  </div>
                </div>
                
                {/* PLACE BID BUTTON */}
                {!isEnded && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/auctions/${auction.id}`);
                    }}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '10px',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      border: 'none',
                      color: '#0a0a0f',
                      fontWeight: '700',
                      fontSize: '13px',
                      letterSpacing: '0.03em',
                      cursor: 'pointer',
                      marginTop: '40px'
                    }}
                  >
                    Place Bid →
                  </button>
                )}
              </div>
            )}
        </div>
        
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { watchlistService } from '../services/api/watchlistService';

export default function AuctionCard({ auction, initialWatchlisted = false }) {
  const { user } = useAuth();
  const [isWatchlisted, setIsWatchlisted] = useState(initialWatchlisted);
  
  const isEnded = auction.auction_status === 'ended' || new Date(auction.end_time) < new Date();
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

  return (
    <Link to={`/auctions/${auction.id}`} className="block group font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm hover:shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 transform group-hover:-translate-y-1">
        
        {/* Thumbnail Layer */}
        <div className="relative h-56 bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <img 
            src={coverImage} 
            alt={auction.title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
          <button 
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
        
        {/* Info Layer (BaT Style Density) */}
        <div className="p-5 flex flex-col justify-between h-48">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight line-clamp-2">
              {auction.title}
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-wide">
              Category #{auction.category_id}
            </p>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between">
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">
                {isEnded ? 'Final Bid' : 'Current Bid'}
              </p>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                ${auction.current_price?.toLocaleString() || '0'}
              </div>
            </div>
            
            <div className={`font-bold text-sm tracking-tight px-3 py-1.5 rounded-lg ${
              isEnded ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' 
              : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 flex items-center gap-1.5'
            }`}>
              {!isEnded && <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>}
              {!isEnded ? formatDistanceToNow(new Date(auction.end_time)) : 'Ended'}
            </div>
          </div>
        </div>
        
      </div>
    </Link>
  );
}

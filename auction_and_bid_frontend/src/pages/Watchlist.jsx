import React, { useState, useEffect, useRef } from 'react';
import { watchlistService } from '../services/api/watchlistService';
import { bidService } from '../services/api/bidService';
import { Bookmark, Loader2, ArrowUpRight, TrendingUp, Search, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { normalizeAuction } from '../services/api/adapters';
import { useCategories } from '../context/CategoryContext';

export default function Watchlist() {
  const { categoryById } = useCategories();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('ending_soonest');
  const [quickBidModal, setQuickBidModal] = useState(null); // holds auction object
  const [quickBidAmount, setQuickBidAmount] = useState('');
  const { addToast } = useToast();
  
  // Track Websockets
  const wsRefs = useRef({});
  // Track price changes for amber ring animation
  const [priceChangedIds, setPriceChangedIds] = useState(new Set());

  const fetchWatchlist = async () => {
    try {
      const data = await watchlistService.getWatchlist();
      const normalized = (data || []).map((a) => normalizeAuction(a, categoryById));
      setAuctions(normalized);
      setupWebSockets(normalized);
    } catch (e) {
      console.error(e);
      addToast('Failed to load watchlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
    return () => {
      // Cleanup all websockets
      Object.values(wsRefs.current).forEach(ws => ws.close());
    };
  }, []);

  const setupWebSockets = (watchlistData) => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    
    watchlistData.forEach(auction => {
      if (!wsRefs.current[auction.id]) {
        const ws = new WebSocket(`${wsUrl}/auctions/ws/${auction.id}`);
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.event === 'bid_placed') {
            setAuctions(prev => prev.map(a => {
              if (a.id === auction.id && a.current_price !== data.current_price) {
                // Trigger amber ring
                setPriceChangedIds(prevIds => new Set([...prevIds, a.id]));
                setTimeout(() => {
                  setPriceChangedIds(prevIds => {
                    const next = new Set(prevIds);
                    next.delete(a.id);
                    return next;
                  });
                }, 3000);
                
                // Update Quick Bid Modal if open
                if (quickBidModal?.id === a.id) {
                  const nextMin = Number(data.current_price) + 1;
                  setQuickBidModal(prevModal => ({ ...prevModal, current_price: Number(data.current_price) }));
                  setQuickBidAmount(String(nextMin));
                }

                return { ...a, current_price: data.current_price, total_bids: data.total_bids };
              }
              return a;
            }));
          }
        };
        wsRefs.current[auction.id] = ws;
      }
    });
  };

  const removeFromWatchlist = async (id) => {
    try {
      await watchlistService.removeFromWatchlist(id);
      setAuctions(prev => prev.filter(a => a.id !== id));
      if (wsRefs.current[id]) {
        wsRefs.current[id].close();
        delete wsRefs.current[id];
      }
      addToast('Removed from watchlist', 'success');
    } catch (e) {
      addToast('Failed to remove from watchlist', 'error');
    }
  };

  const handleQuickBid = async (e, amount) => {
    e.preventDefault();
    try {
      await bidService.placeBid(quickBidModal.id, amount);
      addToast(`Bid of $${amount} placed on ${quickBidModal.title}`, 'success');
      setQuickBidModal(null);
    } catch (e) {
      addToast(e.response?.data?.detail || 'Failed to place bid', 'error');
    }
  };

  const sortedAuctions = [...auctions];
  if (sortBy === 'ending_soonest') sortedAuctions.sort((a,b) => new Date(a.end_time) - new Date(b.end_time));
  if (sortBy === 'price_high') sortedAuctions.sort((a,b) => b.current_price - a.current_price);
  // backend AuctionResponse does not include created_at; use start_time instead
  if (sortBy === 'recently_added') sortedAuctions.sort((a,b) => new Date(b.start_time) - new Date(a.start_time));

  return (
    <div className="max-w-[1400px] mx-auto py-8 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
            <Bookmark className="w-8 h-8 text-amber-500" /> My Watchlist
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Live tracking {auctions.length} vehicles</p>
        </div>
        
        {auctions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sort:</span>
            <select 
              value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wide focus:ring-0 cursor-pointer outline-none"
            >
              <option value="ending_soonest" className="text-slate-900">Ending Soonest</option>
              <option value="price_high" className="text-slate-900">Highest Price</option>
              <option value="recently_added" className="text-slate-900">Recently Added</option>
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-32"><Loader2 className="w-12 h-12 text-amber-500 animate-spin" /></div>
      ) : auctions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="bg-amber-100 dark:bg-amber-900/20 p-6 rounded-full mb-6">
            <Bookmark className="w-12 h-12 text-amber-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Your watchlist is empty</h3>
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 max-w-sm">Keep track of vehicles you love by clicking the heart icon on any listing.</p>
          <Link to="/" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold uppercase tracking-widest px-8 py-3 rounded-lg hover:scale-105 transition-transform shadow-xl">
            Browse Auctions
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedAuctions.map(auction => (
            <div 
              key={auction.id} 
              className={`bg-white dark:bg-slate-900 border-2 rounded-xl overflow-hidden shadow-sm flex flex-col group transition-all duration-500 ${priceChangedIds.has(auction.id) ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/50'}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img 
                  src={auction.images?.find(i => i.is_primary)?.image_url || 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80'} 
                  alt={auction.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <button 
                  onClick={() => removeFromWatchlist(auction.id)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white/90 dark:bg-slate-900/90 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur text-amber-400 font-mono font-black px-3 py-1 rounded text-sm tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> ${auction.current_price.toLocaleString()}
                </div>
              </div>
              <div className="p-5 flex-grow flex flex-col">
                <Link to={`/auctions/${auction.id}`} className="font-black text-lg text-slate-900 dark:text-white leading-tight mb-2 hover:text-amber-500 transition-colors line-clamp-2">
                  {auction.title}
                </Link>
                <div className="mt-auto pt-4 flex gap-2">
                  <Link to={`/auctions/${auction.id}`} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors shrink-0">
                    <ArrowUpRight className="w-5 h-5" />
                  </Link>
                  <button 
                    onClick={() => {
                      setQuickBidModal(auction);
                      setQuickBidAmount(String((Number(auction.current_price) || 0) + 1));
                    }}
                    className="flex-grow bg-amber-500 hover:bg-amber-400 text-slate-900 font-black uppercase tracking-widest text-xs rounded transition-all shadow shadow-amber-500/20"
                  >
                    Quick Bid
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Bid Bottom Sheet / Modal */}
      {quickBidModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setQuickBidModal(null)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Express Bid</h3>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 truncate max-w-[250px] mt-1">{quickBidModal.title}</p>
              </div>
              <button onClick={() => setQuickBidModal(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-800 p-2 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-6 mb-6 text-center">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Current Minimum</div>
              <div className="text-4xl font-mono font-black text-amber-500">${(quickBidModal.current_price + 1).toLocaleString()}</div>
            </div>

            <form onSubmit={e => handleQuickBid(e, parseFloat(quickBidAmount))}>
              <div className="space-y-4">
                <input
                  type="number"
                  min={Number(quickBidModal.current_price) + 1}
                  value={quickBidAmount}
                  onChange={(e) => setQuickBidAmount(e.target.value)}
                  className="w-full font-mono text-xl font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-3 px-4 focus:outline-none focus:border-amber-500 text-slate-900 dark:text-white"
                />
                <button type="submit" className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black tracking-widest uppercase py-4 rounded-lg shadow-xl shadow-amber-500/20 transition-transform hover:scale-[1.02]">
                  Bid ${Number(quickBidAmount || 0).toLocaleString()} Now
                </button>
                <div className="text-center">
                  <Link to={`/auctions/${quickBidModal.id}`} className="text-xs font-bold text-slate-500 hover:text-indigo-500 uppercase tracking-widest transition-colors">Go to full auction page →</Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

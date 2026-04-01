import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { userService } from '../services/api/userService';
import { ratingService } from '../services/api/ratingService';
import { auctionService } from '../services/api/auctionService';
import { Star, Loader2, User, Calendar, TrendingUp } from 'lucide-react';
import { normalizeAuction } from '../services/api/adapters';
import { useCategories } from '../context/CategoryContext';

export default function PublicProfile() {
  const { id } = useParams();
  const { categoryById } = useCategories();
  const [profile, setProfile] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const [profData, rateData, allAuctions] = await Promise.all([
          userService.getPublicProfile(id),
          ratingService.getSellerRatings(id).catch(() => []),
          auctionService.getAuctions(0, 100).catch(() => [])
        ]);
        setProfile(profData);
        setRatings(rateData);
        const normalized = (allAuctions || []).map((a) => normalizeAuction(a, categoryById));
        setAuctions(normalized.filter(a => a.seller_id === parseInt(id)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [id]);

  if (loading) return <div className="flex justify-center mt-32"><Loader2 className="w-12 h-12 text-amber-500 animate-spin" /></div>;
  if (!profile) return <div className="text-center mt-32 text-slate-500 dark:text-slate-400 text-xl font-black uppercase tracking-widest">Seller Profile Not Found</div>;

  const averageRating = ratings.length > 0 
    ? (ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length).toFixed(1) 
    : 0;
  const activeAuctions = auctions.filter((a) => a.auction_status === 'active');
  const completedAuctions = auctions.filter((a) => ['ended', 'cancelled'].includes(a.auction_status));
  const visibleAuctions = tab === 'active' ? activeAuctions : completedAuctions;

  return (
    <div className="max-w-6xl mx-auto space-y-10 font-sans">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-10 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-amber-500 to-amber-700 opacity-10"></div>
        <div className="w-32 h-32 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-500 text-5xl font-black uppercase ring-8 ring-white dark:ring-slate-800 z-10">
          {profile.username?.charAt(0)}
        </div>
        <div className="z-10 text-center md:text-left flex-grow">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{profile.username}</h1>
          <div className="flex flex-col md:flex-row items-center gap-4 mt-3 text-slate-600 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1"><User className="w-4 h-4"/> Role: <span className="uppercase font-bold text-xs tracking-widest">{profile.role}</span></span>
            <span className="hidden md:inline">•</span>
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> Joined: {new Date(profile.created_at).toLocaleDateString()}</span>
          </div>
          
          <div className="mt-6 flex items-center justify-center md:justify-start gap-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500 px-4 py-2 rounded-lg flex items-center gap-2 font-black border border-amber-200 dark:border-amber-800">
              <Star className="w-5 h-5 fill-current" />
              {averageRating} / 5.0
            </div>
            <span className="text-sm text-slate-500 font-bold uppercase tracking-widest">{ratings.length} Reviews</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column - Active Listings */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" /> Listings
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setTab('active')} className={`px-4 py-2 rounded text-xs font-black uppercase tracking-widest ${tab === 'active' ? 'bg-amber-500 text-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`}>Active ({activeAuctions.length})</button>
            <button onClick={() => setTab('completed')} className={`px-4 py-2 rounded text-xs font-black uppercase tracking-widest ${tab === 'completed' ? 'bg-amber-500 text-slate-900' : 'bg-slate-100 dark:bg-slate-800'}`}>Completed ({completedAuctions.length})</button>
          </div>
          {visibleAuctions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {visibleAuctions.map(a => (
                <Link key={a.id} to={`/auctions/${a.id}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:border-amber-500/50 transition-all group">
                  <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img src={a.images?.find(i=>i.is_primary)?.image_url || 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-black text-slate-900 dark:text-white text-lg leading-tight line-clamp-2">{a.title}</h3>
                    <div className="mt-2 font-mono font-black text-amber-500">${a.current_price?.toLocaleString()}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500 uppercase tracking-widest">{a.total_bids} bids · {a.auction_status}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-10 text-center text-slate-500 font-bold uppercase tracking-widest border border-slate-200 dark:border-slate-800">
              No {tab} listings available.
            </div>
          )}
        </div>

        {/* Right Column - Reviews */}
        <div className="space-y-6">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight border-b border-slate-200 dark:border-slate-800 pb-2">Buyer Reviews</h2>
          <div className="space-y-4">
            {ratings.map(r => (
              <div key={r.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1 text-amber-500 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-current' : 'text-slate-300 dark:text-slate-700'}`} />
                  ))}
                </div>
                <p className="text-slate-700 dark:text-slate-300 italic text-sm font-medium">"{r.review}"</p>
                <div className="mt-3 text-xs text-slate-400 font-bold uppercase tracking-widest">
                  Buyer #{r.buyer_id} • {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {ratings.length === 0 && (
              <div className="text-slate-500 text-sm font-bold uppercase tracking-widest italic">No reviews yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

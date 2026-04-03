import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auctionService } from '../services/api/auctionService';
import { paymentService } from '../services/api/paymentService';
import { bidService } from '../services/api/bidService';
import { watchlistService } from '../services/api/watchlistService';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { Loader2, TrendingUp, Users, DollarSign, ExternalLink, Trash2, AlertCircle, Search, Trophy, Calendar, CheckCircle, Play, XCircle, Edit, Heart } from 'lucide-react';
import { formatApiError } from '../utils/apiError';

export default function Dashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [mode, setMode] = useState(user?.role === 'seller' ? 'selling' : 'buying');
  const [activeTab, setActiveTab] = useState(user?.role === 'seller' ? 'my_listings' : 'won_auctions');

  const [myAuctions, setMyAuctions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [myWins, setMyWins] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [mode]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (mode === 'selling') {
        const data = await auctionService.getMyAuctions();
        setMyAuctions(data);
        try { const p = await paymentService.getPayments(); setPayments(p); } catch(e) { setPayments([]); }
      } else {
        const [bidsData, winsData, paymentsData, watchlistData] = await Promise.all([
          bidService.getMyBids().catch(() => []),
          bidService.getMyWins().catch(() => []),
          paymentService.getPayments().catch(() => []),
          watchlistService.getWatchlist().catch(() => [])
        ]);
        setMyBids(bidsData);
        setMyWins(winsData);
        setPayments(paymentsData);
        setWatchlist(watchlistData);
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
    addToast('Dashboard refreshed', 'success');
  };

  const handleRemoveFromWatchlist = async (auctionId) => {
    try {
      await watchlistService.removeFromWatchlist(auctionId);
      setWatchlist(prev => prev.filter(auction => auction.id !== auctionId));
      addToast('Removed from watchlist', 'success');
    } catch (error) {
      addToast('Failed to remove from watchlist', 'error');
    }
  };

  const handleDeleteAuction = async (id) => {
    if (!confirm('Are you sure you want to delete this auction?')) return;
    try {
      await auctionService.deleteAuction(id);
      setMyAuctions(prev => prev.filter(a => a.id !== id));
      addToast('Auction deleted successfully', 'success');
    } catch (e) {
      addToast(formatApiError(e, 'Failed to delete auction'), 'error');
    }
  };

  const handlePublishAuction = async (id) => {
    try {
      await auctionService.changeStatus(id, { status: 'active' });
      setMyAuctions(prev => prev.map(a => a.id === id ? { ...a, auction_status: 'active' } : a));
      addToast('Auction published and now live!', 'success');
    } catch (e) {
      addToast(formatApiError(e, 'Failed to publish auction'), 'error');
    }
  };

  const handleCancelAuction = async (id) => {
    try {
      await auctionService.changeStatus(id, { status: 'cancelled' });
      setMyAuctions(prev => prev.map(a => a.id === id ? { ...a, auction_status: 'cancelled' } : a));
      addToast('Auction cancelled', 'info');
    } catch (e) {
      addToast(formatApiError(e, 'Failed to cancel auction'), 'error');
    }
  };

  // Stats
  const activeCount = myAuctions.filter(a => a.auction_status === 'active').length;
  const totalBids = myAuctions.reduce((acc, a) => acc + (a.total_bids || 0), 0);

  // Payment data for seller
  const sellerPayments = payments.filter(p => p.seller_id === user?.id);
  const buyerPayments = payments.filter(p => p.buyer_id === user?.id);
  const unpaidBuyerPayments = buyerPayments.filter((p) => p.payment_status !== 'completed' && p.payment_status !== 'paid');

  // Calculate revenue from completed payments, not just auction prices
  const totalRevenue = sellerPayments
    .filter(p => p.payment_status === 'completed' || p.payment_status === 'paid')
    .reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

  // Ended auctions won by buyers
  const endedAuctions = myAuctions.filter(a => a.auction_status === 'ended');

  const getStatusBadge = (status) => {
    switch(status) {
      case 'active': return <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded text-xs font-black uppercase tracking-widest">Active</span>;
      case 'ended': return <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded text-xs font-black uppercase tracking-widest">Ended</span>;
      case 'cancelled': return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded text-xs font-black uppercase tracking-widest">Cancelled</span>;
      default: return <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-1 rounded text-xs font-black uppercase tracking-widest">Draft</span>;
    }
  };

  return (
    <div className="py-8 font-sans px-4 lg:px-6">
      
      {/* Top Header & Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Dashboard</h1>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button 
            onClick={() => { setMode('buying'); setActiveTab('won_auctions'); }}
            className={`px-6 py-2 rounded font-bold uppercase tracking-widest text-xs transition-colors ${mode === 'buying' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Buying Activity
          </button>
          <button 
            onClick={() => { setMode('selling'); setActiveTab('my_listings'); }}
            className={`px-6 py-2 rounded font-bold uppercase tracking-widest text-xs transition-colors ${mode === 'selling' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Selling Activity
          </button>
        </div>
      </div>

      {mode === 'selling' && (
        <>
          {/* Top 3 Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex items-center shadow-sm">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mr-4">
                <TrendingUp className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Auctions</p>
                <p className="text-3xl font-mono font-black text-slate-900 dark:text-white tracking-tighter">{activeCount}</p>
              </div>
            </div>
            <div className="glass border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex items-center shadow-sm">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mr-4">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Bids</p>
                <p className="text-3xl font-mono font-black text-slate-900 dark:text-white tracking-tighter">{totalBids}</p>
              </div>
            </div>
            <div className="glass border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex items-center shadow-sm">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mr-4">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Est. Revenue</p>
                <p className="text-3xl font-mono font-black text-slate-900 dark:text-white tracking-tighter">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Seller Tabs */}
          <div className="flex gap-1 border-b-2 border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar mb-8">
            {[
              { id: 'my_listings', label: 'My Listings' },
              { id: 'won_by_buyers', label: 'Won by Buyers' },
              { id: 'payments_received', label: 'Payments Received' }
            ].map(tab => (
              <button 
                key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-black uppercase text-sm tracking-widest whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-slate-900 dark:text-white border-b-4 border-amber-500 -mb-0.5' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="glass border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm min-h-[400px]">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>
            ) : activeTab === 'my_listings' ? (
              <table className="w-full text-left">
                <thead className="glass-soft border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Listing</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Price</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Bids</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {myAuctions.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 flex items-center gap-4">
                        <img src={a.images?.find(i=>i.is_primary)?.image_url || 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80'} className="w-16 h-12 object-cover rounded shadow-sm" />
                        <span className="font-bold text-slate-900 dark:text-white max-w-[200px] truncate">{a.title}</span>
                      </td>
                      <td className="p-4">{getStatusBadge(a.auction_status)}</td>
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-amber-500">${a.current_price?.toLocaleString()}</td>
                      <td className="p-4 font-bold text-slate-600 dark:text-slate-400">{a.total_bids}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2 text-xs font-bold uppercase tracking-widest">
                          <Link to={`/auctions/${a.id}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1"><ExternalLink className="w-3 h-3"/> View</Link>
                          {a.auction_status === 'draft' && (
                            <>
                              <Link to={`/edit-auction/${a.id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center gap-1"><Edit className="w-3 h-3"/> Edit</Link>
                              <button onClick={() => handlePublishAuction(a.id)} className="text-green-600 dark:text-green-400 hover:text-green-800 flex items-center gap-1"><Play className="w-3 h-3"/> Publish</button>
                            </>
                          )}
                          {a.auction_status === 'active' && (
                            <>
                              <Link to={`/edit-auction/${a.id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center gap-1"><Edit className="w-3 h-3"/> Edit</Link>
                              <button onClick={() => handleCancelAuction(a.id)} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 flex items-center gap-1"><XCircle className="w-3 h-3"/> Cancel</button>
                            </>
                          )}
                          {a.auction_status !== 'active' && (
                            <button onClick={() => handleDeleteAuction(a.id)} className="text-red-600 dark:text-red-500 hover:text-red-800 flex items-center gap-1"><Trash2 className="w-3 h-3"/> Del</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {myAuctions.length === 0 && <tr><td colSpan="5" className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">No listings found. <Link to="/create" className="text-amber-500 hover:underline">Create your first auction →</Link></td></tr>}
                </tbody>
              </table>
            ) : activeTab === 'won_by_buyers' ? (
              <table className="w-full text-left">
                <thead className="glass-soft border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Auction</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Final Price</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Bids</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {endedAuctions.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" /> {a.title}
                      </td>
                      <td className="p-4 font-mono font-black text-amber-500">${a.current_price?.toLocaleString()}</td>
                      <td className="p-4 font-bold text-slate-600 dark:text-slate-400">{a.total_bids}</td>
                      <td className="p-4 text-right">
                        <Link to={`/auctions/${a.id}`} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">Details</Link>
                      </td>
                    </tr>
                  ))}
                  {endedAuctions.length === 0 && <tr><td colSpan="4" className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">No auctions have ended yet</td></tr>}
                </tbody>
              </table>
            ) : activeTab === 'payments_received' ? (
              <table className="w-full text-left">
                <thead className="glass-soft border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Auction</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Transaction</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Amount</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Method</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {sellerPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                        {p.auction_title || `Auction #${p.auction_id}`}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">{p.transaction_id?.slice(0, 12)}...</td>
                      <td className="p-4 font-mono font-black text-green-600 dark:text-green-400">${parseFloat(p.amount).toLocaleString()}</td>
                      <td className="p-4 font-bold text-slate-600 dark:text-slate-400 uppercase text-xs tracking-widest">{p.payment_method}</td>
                      <td className="p-4"><span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded text-xs font-black uppercase tracking-widest">{p.payment_status}</span></td>
                      <td className="p-4 text-right text-sm font-medium text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {sellerPayments.length === 0 && <tr><td colSpan="6" className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">No payments received yet</td></tr>}
                </tbody>
              </table>
            ) : null}
          </div>
        </>
      )}

      {mode === 'buying' && (
        <>
          {unpaidBuyerPayments.length > 0 && (
            <div className="mb-6 bg-amber-500/15 text-amber-200 border border-amber-500/40 px-4 py-3 rounded-lg font-bold uppercase tracking-widest text-xs">
              You have {unpaidBuyerPayments.length} unpaid auction(s) — complete payment to secure your wins.
            </div>
          )}
          {/* Buyer Tabs */}
          <div className="flex gap-1 border-b-2 border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar mb-8">
            {[
              { id: 'won_auctions', label: 'My Bids & Wins' },
              { id: 'watchlist', label: 'Watchlist' },
              { id: 'payment_history', label: 'Payment History' }
            ].map(tab => (
              <button 
                key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-black uppercase text-sm tracking-widest whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-slate-900 dark:text-white border-b-4 border-amber-500 -mb-0.5' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="glass border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm min-h-[400px]">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>
            ) : activeTab === 'won_auctions' ? (
              <div>
                {/* Bids Section - Now First */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                    My Bids ({myBids.length})
                  </h3>
                  {myBids.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="glass-soft border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Listing</th>
                          <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Your Bid</th>
                          <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Date</th>
                          <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {myBids.map(b => (
                          <tr key={`bid-${b.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-4 font-bold text-slate-900 dark:text-white">
                              <Link to={`/auctions/${b.auction_id}`} className="hover:text-amber-500 transition-colors">
                                {b.auction_title || `Auction #${b.auction_id}`}
                              </Link>
                            </td>
                            <td className="p-4 font-mono font-black text-amber-500">${parseFloat(b.bid_amount).toLocaleString()}</td>
                            <td className="p-4 text-sm font-medium text-slate-500">{new Date(b.bid_time).toLocaleDateString()}</td>
                            <td className="p-4 text-right">
                              <Link to={`/auctions/${b.auction_id}`} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">View Auction</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center glass-soft rounded-lg border border-slate-200 dark:border-slate-800">
                      <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="font-bold text-slate-500 uppercase tracking-widest">No bids placed yet</p>
                      <p className="text-sm text-slate-400 mt-2"><Link to="/" className="text-amber-500 hover:underline">Browse auctions →</Link></p>
                    </div>
                  )}
                </div>

                {/* Wins Section - Now Second */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    My Wins ({myWins.length})
                  </h3>
                  {myWins.length > 0 ? (
                    <table className="w-full text-left">
                      <thead className="glass-soft border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Listing</th>
                          <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Winning Bid</th>
                          <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Date</th>
                          <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {myWins.map(b => {
                          // Check if this win has been paid
                          const payment = payments.find(p => p.auction_id === b.auction_id);
                          const isPaid = payment && (payment.payment_status === 'completed' || payment.payment_status === 'paid');
                          
                          return (
                            <tr key={`win-${b.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors bg-green-50 dark:bg-green-900/20">
                              <td className="p-4 font-bold text-slate-900 dark:text-white">
                                <div className="flex items-center gap-2">
                                  <Trophy className="w-4 h-4 text-amber-500" />
                                  <Link to={`/auctions/${b.auction_id}`} className="hover:text-amber-500 transition-colors">
                                    {b.auction_title || `Auction #${b.auction_id}`}
                                  </Link>
                                </div>
                              </td>
                              <td className="p-4 font-mono font-black text-green-600 dark:text-green-400">${parseFloat(b.bid_amount).toLocaleString()}</td>
                              <td className="p-4 text-sm font-medium text-slate-500">{new Date(b.bid_time).toLocaleDateString()}</td>
                              <td className="p-4 text-right">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold uppercase tracking-widest rounded-full">
                                    <CheckCircle className="w-3 h-3" />
                                    Already Paid
                                  </span>
                                ) : (
                                  <Link 
                                    to={`/payment/${b.auction_id}`}
                                    className="inline-flex items-center gap-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold uppercase tracking-widest rounded-full transition-colors no-underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                                  >
                                    <DollarSign className="w-3 h-3" />
                                    Pay Now
                                  </Link>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center glass-soft rounded-lg border border-slate-200 dark:border-slate-800">
                      <Trophy className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                      <p className="font-bold text-slate-500 uppercase tracking-widest">No wins yet</p>
                      <p className="text-sm text-slate-400 mt-2">Keep bidding to win auctions!</p>
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'watchlist' ? (
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  My Watchlist ({watchlist.length})
                </h3>
                {watchlist.length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="glass-soft border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Listing</th>
                        <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Current Price</th>
                        <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Ends In</th>
                        <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {watchlist.map(auction => (
                        <tr key={auction.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-4 font-bold text-slate-900 dark:text-white">
                            <Link to={`/auctions/${auction.id}`} className="hover:text-amber-500 transition-colors">
                              {auction.title || `Auction #${auction.id}`}
                            </Link>
                          </td>
                          <td className="p-4 font-mono font-black text-green-600 dark:text-green-400">
                            ${auction.current_price ? parseFloat(auction.current_price).toLocaleString() : '0.00'}
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-500">
                            {auction.end_time ? new Date(auction.end_time).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <Link to={`/auctions/${auction.id}`} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">View</Link>
                              <button
                                onClick={() => handleRemoveFromWatchlist(auction.id)}
                                className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center glass-soft rounded-lg border border-slate-200 dark:border-slate-800">
                    <Heart className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="font-bold text-slate-500 uppercase tracking-widest">No items in watchlist</p>
                    <p className="text-sm text-slate-400 mt-2"><Link to="/" className="text-amber-500 hover:underline">Browse auctions to add items →</Link></p>
                  </div>
                )}
              </div>
            ) : activeTab === 'payment_history' ? (
              <table className="w-full text-left">
                <thead className="glass-soft border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Auction</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Transaction ID</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Amount</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Method</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {buyerPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                        {p.auction_title || `Auction #${p.auction_id}`}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">{p.transaction_id?.slice(0, 16)}...</td>
                      <td className="p-4 font-mono font-black text-slate-900 dark:text-white">${parseFloat(p.amount).toLocaleString()}</td>
                      <td className="p-4 font-bold text-slate-600 dark:text-slate-400 uppercase text-xs tracking-widest">{p.payment_method}</td>
                      <td className="p-4"><span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded text-xs font-black uppercase tracking-widest">{p.payment_status}</span></td>
                      <td className="p-4 text-right text-sm font-medium text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {buyerPayments.length === 0 && <tr><td colSpan="6" className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">No payment records yet</td></tr>}
                </tbody>
              </table>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

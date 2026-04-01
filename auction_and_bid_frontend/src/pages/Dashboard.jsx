import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { auctionService } from '../services/api/auctionService';
import { paymentService } from '../services/api/paymentService';
import { bidService } from '../services/api/bidService';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { Loader2, TrendingUp, Users, DollarSign, ExternalLink, Trash2, AlertCircle, Search, Trophy, Calendar, CheckCircle, Play, XCircle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [mode, setMode] = useState(user?.role === 'seller' ? 'selling' : 'buying');
  const [activeTab, setActiveTab] = useState(user?.role === 'seller' ? 'my_listings' : 'won_auctions');

  const [myAuctions, setMyAuctions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [myBids, setMyBids] = useState([]);
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
        const [bidsData, paymentsData] = await Promise.all([
          bidService.getMyBids().catch(() => []),
          paymentService.getPayments().catch(() => [])
        ]);
        setMyBids(bidsData);
        setPayments(paymentsData);
      }
    } catch (e) {
      console.error(e);
      addToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAuction = async (id) => {
    if (!confirm('Are you sure you want to delete this auction?')) return;
    try {
      await auctionService.deleteAuction(id);
      setMyAuctions(prev => prev.filter(a => a.id !== id));
      addToast('Auction deleted successfully', 'success');
    } catch (e) {
      addToast(e.response?.data?.detail || 'Failed to delete auction', 'error');
    }
  };

  const handlePublishAuction = async (id) => {
    try {
      await auctionService.changeStatus(id, { status: 'active' });
      setMyAuctions(prev => prev.map(a => a.id === id ? { ...a, auction_status: 'active' } : a));
      addToast('Auction published and now live!', 'success');
    } catch (e) {
      addToast(e.response?.data?.detail || 'Failed to publish auction', 'error');
    }
  };

  const handleCancelAuction = async (id) => {
    try {
      await auctionService.changeStatus(id, { status: 'cancelled' });
      setMyAuctions(prev => prev.map(a => a.id === id ? { ...a, auction_status: 'cancelled' } : a));
      addToast('Auction cancelled', 'info');
    } catch (e) {
      addToast(e.response?.data?.detail || 'Failed to cancel auction', 'error');
    }
  };

  // Stats
  const activeCount = myAuctions.filter(a => a.auction_status === 'active').length;
  const totalBids = myAuctions.reduce((acc, a) => acc + (a.total_bids || 0), 0);
  const totalRevenue = myAuctions.filter(a => a.auction_status === 'ended').reduce((acc, a) => acc + (a.current_price || 0), 0);

  // Payment data for seller
  const sellerPayments = payments.filter(p => p.seller_id === user?.id);
  const buyerPayments = payments.filter(p => p.buyer_id === user?.id);
  const unpaidBuyerPayments = buyerPayments.filter((p) => p.payment_status !== 'completed' && p.payment_status !== 'paid');

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
    <div className="max-w-[1400px] mx-auto py-8 font-sans">
      
      {/* Top Header & Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Dashboard</h1>
        
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex items-center shadow-sm">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mr-4">
                <TrendingUp className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Auctions</p>
                <p className="text-3xl font-mono font-black text-slate-900 dark:text-white tracking-tighter">{activeCount}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex items-center shadow-sm">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mr-4">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Bids</p>
                <p className="text-3xl font-mono font-black text-slate-900 dark:text-white tracking-tighter">{totalBids}</p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl flex items-center shadow-sm">
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

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm min-h-[400px]">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>
            ) : activeTab === 'my_listings' ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
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
                            <button onClick={() => handlePublishAuction(a.id)} className="text-green-600 dark:text-green-400 hover:text-green-800 flex items-center gap-1"><Play className="w-3 h-3"/> Publish</button>
                          )}
                          {a.auction_status === 'active' && (
                            <button onClick={() => handleCancelAuction(a.id)} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 flex items-center gap-1"><XCircle className="w-3 h-3"/> Cancel</button>
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
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
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
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <tr>
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
                      <td className="p-4 font-mono text-xs text-slate-500">{p.transaction_id?.slice(0, 12)}...</td>
                      <td className="p-4 font-mono font-black text-green-600 dark:text-green-400">${parseFloat(p.amount).toLocaleString()}</td>
                      <td className="p-4 font-bold text-slate-600 dark:text-slate-400 uppercase text-xs tracking-widest">{p.payment_method}</td>
                      <td className="p-4"><span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded text-xs font-black uppercase tracking-widest">{p.payment_status}</span></td>
                      <td className="p-4 text-right text-sm font-medium text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {sellerPayments.length === 0 && <tr><td colSpan="5" className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">No payments received yet</td></tr>}
                </tbody>
              </table>
            ) : null}
          </div>
        </>
      )}

      {mode === 'buying' && (
        <>
          {unpaidBuyerPayments.length > 0 && (
            <div className="mb-6 bg-amber-100 text-amber-900 border border-amber-300 px-4 py-3 rounded-lg font-bold uppercase tracking-widest text-xs">
              You have {unpaidBuyerPayments.length} unpaid auction(s) — complete payment to secure your wins.
            </div>
          )}
          {/* Buyer Tabs */}
          <div className="flex gap-1 border-b-2 border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar mb-8">
            {[
              { id: 'won_auctions', label: 'My Bids & Wins' },
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

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm min-h-[400px]">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>
            ) : activeTab === 'won_auctions' ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Auction</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Your Bid</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Date</th>
                    <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {myBids.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 font-bold text-slate-900 dark:text-white">
                        <Link to={`/auctions/${b.auction_id}`} className="hover:text-amber-500 transition-colors">Auction #{b.auction_id}</Link>
                      </td>
                      <td className="p-4 font-mono font-black text-amber-500">${parseFloat(b.bid_amount).toLocaleString()}</td>
                      <td className="p-4 text-sm font-medium text-slate-500">{new Date(b.bid_time).toLocaleDateString()}</td>
                      <td className="p-4 text-right">
                        <Link to={`/auctions/${b.auction_id}`} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">View Auction</Link>
                      </td>
                    </tr>
                  ))}
                  {myBids.length === 0 && <tr><td colSpan="4" className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">You haven't placed any bids yet. <Link to="/" className="text-amber-500 hover:underline">Browse auctions →</Link></td></tr>}
                </tbody>
              </table>
            ) : activeTab === 'payment_history' ? (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <tr>
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
                      <td className="p-4 font-mono text-xs text-slate-500">{p.transaction_id?.slice(0, 16)}...</td>
                      <td className="p-4 font-mono font-black text-slate-900 dark:text-white">${parseFloat(p.amount).toLocaleString()}</td>
                      <td className="p-4 font-bold text-slate-600 dark:text-slate-400 uppercase text-xs tracking-widest">{p.payment_method}</td>
                      <td className="p-4"><span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded text-xs font-black uppercase tracking-widest">{p.payment_status}</span></td>
                      <td className="p-4 text-right text-sm font-medium text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {buyerPayments.length === 0 && <tr><td colSpan="5" className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">No payment records yet</td></tr>}
                </tbody>
              </table>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

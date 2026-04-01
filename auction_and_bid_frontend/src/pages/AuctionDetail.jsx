import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { auctionService } from '../services/api/auctionService';
import { bidService } from '../services/api/bidService';
import { commentService } from '../services/api/commentService';
import { watchlistService } from '../services/api/watchlistService';
import axiosClient from '../services/api/axiosClient';
import { Heart, Flag, ChevronRight, Eye, Users, Trophy, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AuctionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const ws = useRef(null);

  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [bidAmount, setBidAmount] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isWatchlisted, setIsWatchlisted] = useState(false);

  // Tab State: 'description' | 'bids' | 'comments' | 'attributes' | 'extensions'
  const [activeTab, setActiveTab] = useState('description');
  
  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Fraudulent listing');
  const [reportText, setReportText] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState({ diff: 0, text: '', warningLevel: 0 }); // 0: normal, 1: <10m, 2: <1m

  // Gallery
  const [primaryImageIdx, setPrimaryImageIdx] = useState(0);

  useEffect(() => {
    fetchData();
    if (user) checkWatchlistStatus();
    setupWebSocket();
    return () => { if (ws.current) ws.current.close(); };
  }, [id, user]);

  useEffect(() => {
    if (!auction) return;
    const interval = setInterval(updateTimer, 1000);
    updateTimer();
    return () => clearInterval(interval);
  }, [auction]);

  const updateTimer = () => {
    if (!auction) return;
    const now = new Date();
    const end = new Date(auction.end_time);
    const diffMs = end - now;
    
    if (diffMs <= 0 || auction.auction_status === 'ended') {
      setTimeLeft({ diff: 0, text: 'Ended', warningLevel: 0 });
      return;
    }
    
    const h = Math.floor(diffMs / 3600000);
    const m = Math.floor((diffMs % 3600000) / 60000);
    const s = Math.floor((diffMs % 60000) / 1000);
    
    let text = `${h}h ${m}m ${s}s`;
    if (h === 0) text = `${m}:${s.toString().padStart(2, '0')}`;
    
    let warningLevel = 0;
    if (h === 0 && m < 10) warningLevel = 1;
    if (h === 0 && m === 0 && s < 60) warningLevel = 2;
    
    setTimeLeft({ diff: diffMs, text, warningLevel });
  };

  const fetchData = async () => {
    try {
      const [auctionData, bidsData, commentsData] = await Promise.all([
        auctionService.getAuction(id),
        bidService.getBidsForAuction(id),
        commentService.getComments(id)
      ]);
      setAuction(auctionData);
      setBids(bidsData);
      setComments(commentsData);
      
      const primaryIdx = auctionData.images?.findIndex(img => img.is_primary);
      setPrimaryImageIdx(primaryIdx >= 0 ? primaryIdx : 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkWatchlistStatus = async () => {
    try {
      const list = await watchlistService.getWatchlist();
      if (list.some(a => a.id === parseInt(id))) setIsWatchlisted(true);
    } catch (e) {}
  };

  const setupWebSocket = () => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    ws.current = new WebSocket(`${wsUrl}/auctions/ws/${id}`);
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === 'bid_placed') {
        setAuction(prev => ({ 
          ...prev, 
          current_price: data.current_price, 
          total_bids: data.total_bids,
          end_time: data.new_end_time || prev.end_time 
        }));
        
        // Anti-snipe detection
        if (data.time_extended) {
          addToast("Time extended by 30 seconds — last-minute bid detected.", "warning", 5000);
        }

        bidService.getBidsForAuction(id).then(newBids => {
          setBids(newBids);
          // Outbid logic
          if (user && newBids.length > 0 && newBids[0].bidder_id !== user.id) {
            const hasBidPreviously = newBids.some(b => b.bidder_id === user.id);
            if (hasBidPreviously) addToast(`You've been outbid — current price is $${data.current_price}`, 'error');
          }
        });
      }
    };
  };

  const toggleWatchlist = async () => {
    if (!user) return addToast('Please login to use the watchlist.', 'error');
    try {
      if (isWatchlisted) { await watchlistService.removeFromWatchlist(id); setIsWatchlisted(false); addToast('Removed from Watchlist', 'info'); }
      else { await watchlistService.addToWatchlist(id); setIsWatchlisted(true); addToast('Added to Watchlist', 'success'); }
    } catch (e) { console.error(e); }
  };

  const handlePlaceBid = async (e) => {
    e.preventDefault();
    if (!user) return addToast('Log in to bid.', 'error');
    setBidLoading(true);
    
    // Optimistic UI update
    const prevPrice = auction.current_price;
    const attemptedBid = parseFloat(bidAmount);
    setAuction(prev => ({ ...prev, current_price: attemptedBid }));

    try {
      await bidService.placeBid(id, attemptedBid);
      setBidAmount('');
      addToast(`Bid of $${attemptedBid} placed successfully.`, 'success');
    } catch (err) { 
      setAuction(prev => ({ ...prev, current_price: prevPrice })); // Revert on failure
      addToast(err.response?.data?.detail || 'Failed to place bid', 'error');
    } finally { 
      setBidLoading(false); 
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!user) return addToast('Login required', 'error');
    if (!commentText.trim()) return;
    try {
      const newComment = await commentService.postComment(id, { comment_text: commentText });
      setComments([...comments, newComment]); setCommentText('');
      addToast('Comment posted', 'success');
    } catch (e) { addToast('Failed to post comment', 'error'); }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!user) return addToast("You must be logged in to report.", "error");
    setIsReporting(true);
    try {
      const fullReason = `${reportReason}: ${reportText}`;
      await axiosClient.post(`/auctions/${id}/report?reason=${encodeURIComponent(fullReason)}`);
      addToast("Your report has been received and will be reviewed.", "success");
      setShowReportModal(false);
      setReportText('');
    } catch (err) {
      addToast("Failed to submit report.", "error");
    } finally {
      setIsReporting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentService.deleteComment(id, commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      addToast('Comment deleted', 'success');
    } catch (e) {
      addToast('Failed to delete comment', 'error');
    }
  };

  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const handlePostReply = async (parentId) => {
    if (!replyText.trim()) return;
    try {
      const newComment = await commentService.postComment(id, { comment_text: replyText, parent_comment_id: parentId });
      setComments(prev => [...prev, newComment]);
      setReplyTo(null);
      setReplyText('');
      addToast('Reply posted', 'success');
    } catch (e) {
      addToast('Failed to post reply', 'error');
    }
  };

  if (loading) return <div className="p-20 text-center dark:text-white font-sans">Loading auction data...</div>;
  if (!auction) return <div className="p-20 text-center dark:text-white font-sans">Auction not found</div>;

  const isEnded = auction.auction_status === 'ended' || timeLeft.diff <= 0;
  const isWinner = isEnded && bids.length > 0 && user && bids[0].bidder_id === user.id;
  const isSeller = user && auction.seller_id === user.id;
  const isOutbid = !isWinner && !isSeller && !isEnded && bids.length > 0 && user && bids[0].bidder_id !== user.id && bids.some(b => b.bidder_id === user.id);
  
  const allImages = auction.images || [];
  const primaryImgUrl = allImages[primaryImageIdx]?.image_url || 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&q=80&w=1200';

  return (
    <div className="max-w-[1400px] mx-auto font-sans">
      
      {/* Winner Banner */}
      {isWinner && (
        <div className="w-full bg-green-600 text-white p-4 flex items-center justify-between shadow-lg mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6" />
            <span className="font-bold text-lg">You won this auction for ${auction.current_price.toLocaleString()} — complete your payment</span>
          </div>
          <button className="bg-white text-green-700 hover:bg-green-50 px-6 py-2 rounded font-black tracking-widest uppercase text-sm transition-colors shadow">Pay now</button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-12">
        {/* LEFT 58% PANEL */}
        <div className="lg:w-[58%] space-y-8">
          
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            <Link to="/" className="hover:text-amber-500 transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to={`/?category_id=${auction.category_id}`} className="hover:text-amber-500 transition-colors">Category #{auction.category_id}</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 dark:text-white truncate max-w-[200px]">{auction.title}</span>
          </div>

          {/* Title & Seller */}
          <div>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">{auction.title}</h1>
            <p className="mt-4 font-bold text-slate-600 dark:text-slate-400">
              Offered by <Link to={`/seller/${auction.seller_id}`} className="text-indigo-600 dark:text-indigo-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer">{auction.seller_id}</Link>
            </p>
          </div>

          {/* Gallery Lightbox (Simulated) */}
          <div className="space-y-4">
            <div className="bg-slate-100 dark:bg-slate-900 rounded-sm border border-slate-200 dark:border-slate-800 overflow-hidden cursor-zoom-in relative group aspect-[4/3] flex items-center justify-center">
              <img src={primaryImgUrl} alt="Primary" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                {allImages.map((img, idx) => (
                  <button 
                    key={idx} onClick={() => setPrimaryImageIdx(idx)}
                    className={`flex-shrink-0 w-32 aspect-[4/3] rounded-sm overflow-hidden border-2 transition-all ${idx === primaryImageIdx ? 'border-amber-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img.image_url} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5 Tabs Component */}
          <div className="mt-12">
            <div className="flex gap-1 border-b-2 border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar uppercase font-black text-sm tracking-widest text-slate-500 dark:text-slate-400">
              {['description', 'bids', 'comments', 'attributes', 'extensions'].map(tab => (
                <button 
                  key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 transition-colors whitespace-nowrap ${activeTab === tab ? 'text-slate-900 dark:text-white border-b-4 border-amber-500 -mb-0.5' : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
                >
                  {tab === 'bids' ? 'Bid History' : tab === 'extensions' ? 'Extension Log' : tab}
                </button>
              ))}
            </div>
            
            <div className="py-8 min-h-[400px]">
              {/* DESCRIPTION TAB */}
              {activeTab === 'description' && (
                <div className="prose prose-lg dark:prose-invert max-w-none font-medium leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {auction.description}
                </div>
              )}

              {/* BIDS TAB */}
              {activeTab === 'bids' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
                  {bids.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">No bids placed</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-widest text-slate-500">
                          <th className="p-4 w-16">Rank</th>
                          <th className="p-4">Bidder</th>
                          <th className="p-4 text-right">Amount</th>
                          <th className="p-4 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {bids.map((bid, i) => (
                          <tr key={i} className={`transition-colors ${i === 0 ? 'bg-amber-50 dark:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-900/30'}`}>
                            <td className="p-4 font-black text-slate-400">{i + 1}</td>
                            <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              {i === 0 && <Trophy className="w-4 h-4 text-amber-500" />} User ***{bid.bidder_id.toString().slice(-3).padStart(3, 'x')}
                            </td>
                            <td className="p-4 font-mono font-bold text-lg text-right text-slate-900 dark:text-white">${bid.bid_amount.toLocaleString()}</td>
                            <td className="p-4 text-sm font-medium text-slate-500 dark:text-slate-400 text-right">{formatDistanceToNow(new Date(bid.bid_time))} ago</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* COMMENTS TAB */}
              {activeTab === 'comments' && (
                <div className="space-y-6">
                  {comments.length === 0 && <div className="text-center py-12 text-slate-500 italic">No comments yet.</div>}
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center font-black text-white shrink-0 uppercase">
                        U{c.user_id}
                      </div>
                      <div className="w-full">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-bold text-slate-900 dark:text-white">User #{c.user_id}</span>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{formatDistanceToNow(new Date(c.created_at))} ago</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{c.comment_text}</p>
                        <div className="mt-3 flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                          <button onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(''); }} className="hover:text-amber-500 transition-colors cursor-pointer">{replyTo === c.id ? 'Cancel' : 'Reply'}</button>
                          {user && user.id === c.user_id && <button onClick={() => handleDeleteComment(c.id)} className="hover:text-red-500 transition-colors cursor-pointer">Delete</button>}
                        </div>
                        {replyTo === c.id && (
                          <div className="mt-3 flex gap-2">
                            <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply..." className="flex-grow bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-sm font-medium focus:outline-none focus:border-amber-500 dark:text-white" />
                            <button onClick={() => handlePostReply(c.id)} className="bg-amber-500 text-slate-900 font-black uppercase text-xs tracking-widest px-4 py-2 rounded">Send</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {user ? (
                    <form onSubmit={handlePostComment} className="pt-6 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex gap-3">
                        <textarea rows="2" placeholder="Ask a question..." value={commentText} onChange={e=>setCommentText(e.target.value)} required className="flex-grow bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-4 font-medium focus:outline-none focus:border-amber-500 transition-colors resize-none"></textarea>
                        <button type="submit" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest px-8 rounded hover:bg-amber-500 dark:hover:bg-amber-500 transition-colors">Post</button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center py-6 font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 mt-6">Log in to post comments</div>
                  )}
                </div>
              )}

              {/* ATTRIBUTES TAB */}
              {activeTab === 'attributes' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {auction.attributes?.length > 0 ? auction.attributes.map(a => (
                    <div key={a.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded flex justify-between">
                      <span className="font-bold text-slate-500 uppercase tracking-widest text-xs">{a.attribute_name}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{a.attribute_value}</span>
                    </div>
                  )) : (
                    <div className="col-span-2 text-center py-10 text-slate-500 font-bold uppercase tracking-widest">No attributes listed</div>
                  )}
                </div>
              )}

              {/* EXTENSIONS TAB */}
              {activeTab === 'extensions' && (
                <div className="space-y-2">
                  <div className="text-center py-10 text-slate-500 font-bold uppercase tracking-widest">No last-minute extensions occurred on this lot.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT 42% STICKY PANEL */}
        <div className="lg:w-[42%]">
          <div className="sticky top-24 space-y-6">
            
            {/* Outbid Banner */}
            {isOutbid && (
              <div className="bg-amber-100 border-l-4 border-amber-500 p-4 rounded text-amber-900 flex justify-between items-center animate-in slide-in-from-top flex-wrap gap-2">
                <span className="font-bold">You've been outbid — current price is ${auction.current_price.toLocaleString()}</span>
                <button onClick={() => { setBidAmount(auction.current_price + 250); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="font-black uppercase tracking-widest text-xs border-b-2 border-amber-900 pb-0.5 hover:text-amber-700 transition-colors whitespace-nowrap">Bid again →</button>
              </div>
            )}

            {/* Core Bid Block */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-xl p-8 shadow-sm relative overflow-hidden">
              {/* Header Stats */}
              <div className="flex justify-between items-center mb-6">
                <div className="text-slate-500 font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                  <Users className="w-4 h-4" /> {auction.total_bids} Bids placed
                </div>
                <div className="text-slate-500 font-bold tracking-widest text-xs uppercase flex items-center gap-2 group cursor-help">
                  <Eye className="w-4 h-4" /> 1,284 Views
                </div>
              </div>

              {/* Huge Price */}
              <div className="mb-8">
                <div className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">{isEnded ? "Final Price" : "Current Bid"}</div>
                <div className="font-mono text-7xl font-black text-amber-500 tracking-tighter leading-none">${auction.current_price?.toLocaleString()}</div>
              </div>

              {/* Countdown Tracker */}
              <div className={`mb-8 p-6 rounded-lg flex items-center justify-between border-2 transition-colors duration-500 ${
                isEnded ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' :
                timeLeft.warningLevel === 2 ? 'bg-red-50 border-red-500 dark:bg-red-950/20' :
                timeLeft.warningLevel === 1 ? 'bg-amber-50 border-amber-500 dark:bg-amber-950/20' :
                'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
              }`}>
                <div className="font-black uppercase tracking-widest text-sm text-slate-500 dark:text-slate-400">{isEnded ? 'Auction Ended' : 'Time Left'}</div>
                <div 
                  aria-live="polite" 
                  className={`font-mono font-black tabular-nums transition-all duration-300 ${
                    isEnded ? 'text-2xl text-slate-600 dark:text-slate-300' :
                    timeLeft.warningLevel === 2 ? 'text-4xl text-red-600 animate-pulse' :
                    timeLeft.warningLevel === 1 ? 'text-4xl text-amber-600' :
                    'text-3xl text-slate-900 dark:text-white'
                  }`}
                >
                  {timeLeft.text}
                </div>
              </div>

              {/* Action Form */}
              {isEnded ? (
                <div className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-black tracking-widest uppercase p-4 rounded text-center">
                  Auction Closed
                </div>
              ) : isSeller ? (
                <div className="w-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-black tracking-widest uppercase p-4 rounded text-center">
                  You are the Seller
                </div>
              ) : (
                <form onSubmit={handlePlaceBid} className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xl font-bold text-slate-400">$</span>
                    <input 
                      type="number" 
                      required 
                      disabled={bidLoading}
                      min={parseFloat(auction.current_price) + 1}
                      placeholder={`Min bid: ${(parseFloat(auction.current_price) + 1).toLocaleString()}`}
                      value={bidAmount}
                      onChange={e => setBidAmount(e.target.value)}
                      className="w-full font-mono text-2xl font-black bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-lg py-4 pl-10 pr-4 focus:outline-none focus:border-amber-500 text-slate-900 dark:text-white transition-colors"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={bidLoading || !bidAmount}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black uppercase tracking-widest text-lg p-5 rounded-lg transition-all shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] disabled:opacity-50 disabled:shadow-none"
                  >
                    {bidLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Place Bid'}
                  </button>
                </form>
              )}

              {/* Watchlist Toggle */}
              <button 
                onClick={toggleWatchlist} 
                className={`w-full mt-4 p-4 rounded-lg font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 border-2 transition-colors ${
                  isWatchlisted 
                    ? 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-500' 
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Heart className={`w-5 h-5 ${isWatchlisted ? 'fill-current' : ''}`} /> 
                {isWatchlisted ? 'Watching' : 'Add to Watchlist'}
              </button>
            </div>

            {/* Bottom Form Actions */}
            <div className="flex justify-between items-center px-4">
              <Link to={`/seller/${auction.seller_id}`} className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-amber-500 transition-colors">Contact Seller</Link>
              <button onClick={() => setShowReportModal(true)} className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 hover:text-red-500 transition-colors cursor-pointer">
                <Flag className="w-3 h-3" /> Report this auction
              </button>
            </div>
            
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setShowReportModal(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-500" /> Report Auction
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">If you suspect this listing violates our trust policies, please provide details for our moderation team.</p>
            
            <form onSubmit={submitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Primary Reason</label>
                <select value={reportReason} onChange={e=>setReportReason(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-medium focus:border-red-500 focus:outline-none transition-colors dark:text-white">
                  <option>Counterfeit</option>
                  <option>Prohibited item</option>
                  <option>Fraudulent listing</option>
                  <option>Misleading description</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Additional Details</label>
                <textarea required rows="4" value={reportText} onChange={e=>setReportText(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 font-medium focus:border-red-500 focus:outline-none transition-colors dark:text-white resize-none" placeholder="Please provide evidence or context..."></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowReportModal(false)} className="px-6 py-2.5 rounded-lg font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors uppercase tracking-widest text-sm">Cancel</button>
                <button type="submit" disabled={isReporting} className="px-6 py-2.5 rounded-lg font-black text-white bg-red-600 hover:bg-red-700 transition-colors uppercase tracking-widest text-sm disabled:opacity-50">
                  {isReporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

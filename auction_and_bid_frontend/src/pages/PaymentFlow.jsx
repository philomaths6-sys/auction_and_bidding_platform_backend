import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { auctionService } from '../services/api/auctionService';
import { paymentService } from '../services/api/paymentService';
import { ratingService } from '../services/api/ratingService';
import { useToast } from '../context/ToastContext';
import { ShieldCheck, CreditCard, Wallet, Lock, CheckCircle2, Star, ChevronLeft } from 'lucide-react';
import { formatApiError } from '../utils/apiError';

export default function PaymentFlow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [auction, setAuction] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  // Rating State
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

  useEffect(() => {
    auctionService.getAuction(id).then(setAuction).catch(console.error);
  }, [id]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const result = await paymentService.createPayment({
        auction_id: parseInt(id),
        payment_method: paymentMethod
      });
      setPaymentResult(result);
      setIsSuccess(true);
      window.scrollTo(0, 0);
    } catch (err) {
      addToast(formatApiError(err, 'Payment failed. Please try again.'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!rating) return addToast('Please select a star rating first.', 'error');
    setIsRatingSubmitting(true);
    try {
      await ratingService.postRating({
        auction_id: parseInt(id),
        seller_id: auction.seller_id,
        rating: rating,
        review: reviewText || null
      });
      addToast('Thank you! Your seller review has been published.', 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(formatApiError(err, 'Failed to submit rating'), 'error');
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  if (!auction) return <div className="p-20 text-center font-bold text-slate-500 uppercase tracking-widest">Loading invoice...</div>;

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 font-sans animate-in zoom-in-95 duration-500">
        <div className="bg-white dark:bg-slate-900 border-2 border-green-500/20 dark:border-green-500/30 rounded-2xl p-8 mb-8 text-center shadow-lg shadow-green-500/10">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Payment Secured</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">Your transaction has been confirmed and the seller has been notified.</p>
          
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-left mb-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Receipt Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between font-medium">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-mono text-slate-900 dark:text-white">{paymentResult?.transaction_id || 'N/A'}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-slate-500">Total Amount</span>
                <span className="font-mono font-bold text-amber-500">${auction.current_price?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-slate-500">Payment Method</span>
                <span className="text-slate-900 dark:text-white uppercase text-sm font-bold">{paymentMethod}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-slate-500">Date</span>
                <span className="text-slate-900 dark:text-white">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <Link to="/dashboard" className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:underline">← Return to Dashboard</Link>
        </div>

        {/* Rate Seller Component */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 text-center">Rate Your Seller</h2>
          <p className="text-slate-500 text-center text-sm font-medium mb-6">
            How was your transaction experience with @{auction.seller_username || `user${auction.seller_id}`}?
          </p>
          
          <form onSubmit={handleSubmitRating}>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} type="button" 
                  onMouseEnter={() => setHoveredRating(star)} 
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star className={`w-10 h-10 ${star <= (hoveredRating || rating) ? 'fill-amber-500 text-amber-500' : 'text-slate-300 dark:text-slate-700'}`} />
                </button>
              ))}
            </div>
            
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Written Review (Optional)</label>
              <textarea 
                rows="4" maxLength={500} 
                value={reviewText} onChange={e=>setReviewText(e.target.value)}
                placeholder="Describe your experience with the seller..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 font-medium focus:outline-none focus:border-amber-500 transition-colors resize-none"
              ></textarea>
              <div className="text-right text-xs font-bold text-slate-400 mt-2">{reviewText.length}/500</div>
            </div>

            <button type="submit" disabled={isRatingSubmitting} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest py-4 rounded-xl shadow-xl transition-transform hover:scale-[1.02] disabled:opacity-50">
              Submit Rating
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1000px] mx-auto py-12 px-4 font-sans">
      <div className="mb-8">
        <Link to="/dashboard" className="text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Checkout Form */}
        <div className="lg:w-3/5">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-8">Secure Checkout</h1>
          
          <form onSubmit={handlePayment} className="space-y-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-500" /> Select Payment Method
              </h2>
              
              <div className="space-y-4">
                <label className={`flex items-center p-5 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-amber-300'}`}>
                  <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={() => setPaymentMethod('card')} className="w-5 h-5 accent-amber-500 mr-4" />
                  <div className="flex-grow">
                    <p className="font-bold text-slate-900 dark:text-white">Credit or Debit Card</p>
                    <p className="text-sm text-slate-500 font-medium">Powered securely by Stripe</p>
                  </div>
                  <CreditCard className={`w-6 h-6 ${paymentMethod === 'card' ? 'text-amber-500' : 'text-slate-400'}`} />
                </label>

                <label className={`flex items-center p-5 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'bank' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-amber-300'}`}>
                  <input type="radio" name="payment" value="bank" checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} className="w-5 h-5 accent-amber-500 mr-4" />
                  <div className="flex-grow">
                    <p className="font-bold text-slate-900 dark:text-white">Direct Bank Transfer</p>
                    <p className="text-sm text-slate-500 font-medium">Wire transfer via Plaid (ACH)</p>
                  </div>
                  <ShieldCheck className={`w-6 h-6 ${paymentMethod === 'bank' ? 'text-amber-500' : 'text-slate-400'}`} />
                </label>
              </div>
            </div>

            <button type="submit" disabled={isProcessing} className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black uppercase tracking-widest py-5 rounded-2xl shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3">
              {isProcessing ? <span className="animate-pulse">Authorizing Request...</span> : <><Lock className="w-5 h-5" /> Confirm Payment — ${(auction.current_price).toLocaleString()}</>}
            </button>
            <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> SSL Encrypted Transaction
            </p>
          </form>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:w-2/5">
          <div className="sticky top-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Order Summary</h2>
            
            <div className="flex gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="w-20 h-16 rounded overflow-hidden bg-slate-200 shrink-0 border border-slate-300 dark:border-slate-700">
                <img src={auction.images?.find(i=>i.is_primary)?.image_url || 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48'} className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white leading-tight line-clamp-2">{auction.title}</h3>
                <p className="text-xs font-bold text-slate-500 uppercase mt-1">Lot #{auction.id}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex justify-between font-medium">
                <span className="text-slate-500">Winning Bid</span>
                <span className="font-mono text-slate-900 dark:text-white">${auction.current_price?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-slate-500">Buyer's Premium (5%)</span>
                <span className="font-mono text-slate-900 dark:text-white">${(auction.current_price * 0.05).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="font-black uppercase tracking-widest text-slate-500 text-sm">Total Due</span>
              <span className="font-mono font-black text-2xl text-amber-500">${(auction.current_price * 1.05).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

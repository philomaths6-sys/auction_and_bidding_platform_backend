import { useState } from 'react';
import { auctionService } from '../services/api/auctionService';
import { Shield, Ban, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

const AdminAuctionActions = ({ auction, onActionSuccess, onActionError }) => {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null);

  const handleCancelAuction = async () => {
    if (!window.confirm(`Are you sure you want to cancel auction "${auction.title}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setAction('cancel');
    
    try {
      const result = await auctionService.adminCancelAuction(auction.id);
      onActionSuccess?.(result, 'cancel');
    } catch (error) {
      console.error('Error cancelling auction:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to cancel auction';
      onActionError?.(errorMessage);
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleDeleteAuction = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete auction "${auction.title}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setAction('delete');
    
    try {
      const result = await auctionService.adminDeleteAuction(auction.id);
      onActionSuccess?.(result, 'delete');
    } catch (error) {
      console.error('Error deleting auction:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete auction';
      onActionError?.(errorMessage);
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const canCancel = auction.auction_status === 'active';
  const canDelete = ['cancelled', 'ended'].includes(auction.auction_status);

  return (
    <div className="flex items-center gap-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
      <div className="flex items-center gap-2 text-amber-500">
        <Shield className="w-4 h-4" />
        <span className="text-xs font-bold uppercase tracking-wider">Admin</span>
      </div>
      
      <div className="flex items-center gap-2">
        {canCancel && (
          <button
            onClick={handleCancelAuction}
            disabled={loading}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
              loading && action === 'cancel'
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/50'
            }`}
            title="Cancel this auction"
          >
            {loading && action === 'cancel' ? (
              <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Ban className="w-3 h-3" />
            )}
            {loading && action === 'cancel' ? 'Cancelling...' : 'Cancel'}
          </button>
        )}

        {canDelete && (
          <button
            onClick={handleDeleteAuction}
            disabled={loading}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
              loading && action === 'delete'
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50'
            }`}
            title="Delete this auction permanently"
          >
            {loading && action === 'delete' ? (
              <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
            {loading && action === 'delete' ? 'Deleting...' : 'Delete'}
          </button>
        )}

        {!canCancel && !canDelete && (
          <div className="flex items-center gap-1 text-slate-500 text-xs">
            <AlertTriangle className="w-3 h-3" />
            <span>No actions available</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuctionActions;

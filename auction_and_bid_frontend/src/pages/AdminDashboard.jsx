import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/api/adminService';
import { auctionService } from '../services/api/auctionService';
import { categoryService } from '../services/api/categoryService';
import { useToast } from '../context/ToastContext';
import { Users, AlertTriangle, ShieldAlert, Activity, Ban, CheckCircle2, MoreVertical, Search, FileText, ScrollText, Shield, Trash2, TrendingUp, Plus, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatApiError } from '../utils/apiError';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [reports, setReports] = useState([]);
  const [fraudFlags, setFraudFlags] = useState([]);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [allAuctions, setAllAuctions] = useState([]);
  const [featuredAuctionIds, setFeaturedAuctionIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banInput, setBanInput] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', parent_category_id: null });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [reps, flags, usersData, logsData, auctionsData, featuredIds, categoriesData] = await Promise.all([
        adminService.getReports().catch(() => []),
        adminService.getFraudFlags().catch(() => []),
        adminService.getAllUsers().catch(() => []),
        adminService.getLogs().catch(() => []),
        auctionService.getAuctions(0, 200).catch(() => []),
        adminService.getFeaturedAuctions().catch(() => []),
        categoryService.getAllCategoriesForAdmin().catch(() => [])
      ]);
      setReports(reps);
      setFraudFlags(flags);
      setUsers(usersData);
      setLogs(logsData);
      setAllAuctions(auctionsData);
      setFeaturedAuctionIds(featuredIds);
      setCategories(categoriesData);
    } catch (e) {
      console.error(e);
      addToast('Failed to load some admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (identifier) => {
    if (!identifier) return addToast('Enter a user ID or username', 'error');
    if (!window.confirm(`Are you sure you want to ban ${identifier}? This action requires manual reversal.`)) return;
    try {
      await adminService.banUser(identifier);
      addToast(`User ${identifier} has been banned`, 'success');
      setUsers(prev => prev.map(u => (u.id.toString() === identifier.toString() || u.username === identifier) ? { ...u, role: 'banned' } : u));
      setBanInput('');
    } catch (e) {
      addToast(formatApiError(e, 'Failed to ban user'), 'error');
    }
  };

  const handlePromoteAdmin = async (userId) => {
    try {
      await adminService.promoteAdmin(userId);
      addToast(`User #${userId} promoted to admin`, 'success');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: 'admin' } : u));
    } catch (e) {
      addToast(formatApiError(e, 'Failed to promote user'), 'error');
    }
  };

  const handleReportAction = async (reportId, status) => {
    try {
      await adminService.updateReportStatus(reportId, status);
      setReports(prev => prev.filter(r => r.id !== reportId));
      addToast(`Report ${status}`, 'success');
    } catch (e) {
      addToast(formatApiError(e, 'Failed to update report'), 'error');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Permanently remove this report?')) return;
    try {
      await adminService.deleteReport(reportId);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      addToast('Report removed', 'success');
    } catch (e) {
      addToast(formatApiError(e, 'Failed to remove report'), 'error');
    }
  };

  const handleCancelAuctionFromReport = async (r) => {
    const title = r.auction_title || `Auction #${r.auction_id}`;
    if (!window.confirm(`Cancel listing “${title}”? The auction will be set to cancelled.`)) return;
    try {
      await adminService.cancelAuctionFromReport(r.id);
      setReports((prev) => prev.filter((rep) => rep.id !== r.id));
      setAllAuctions((prev) =>
        prev.map((a) => (a.id === r.auction_id ? { ...a, auction_status: 'cancelled' } : a))
      );
      addToast('Auction cancelled', 'success');
    } catch (e) {
      addToast(formatApiError(e, 'Could not cancel auction'), 'error');
    }
  };

  const handleAdminCancelAuction = async (auctionId) => {
  const auction = allAuctions.find(a => a.id === auctionId);
  if (!auction) return;
  
  if (!window.confirm(`Cancel auction "${auction.title}"? This will set the auction status to cancelled.`)) return;
  
  try {
    await auctionService.adminCancelAuction(auctionId);
    setAllAuctions(prev => 
      prev.map(a => a.id === auctionId ? { ...a, auction_status: 'cancelled' } : a)
    );
    addToast('Auction cancelled successfully', 'success');
  } catch (e) {
    addToast(formatApiError(e, 'Failed to cancel auction'), 'error');
  }
};

const handleAdminDeleteAuction = async (auctionId) => {
  const auction = allAuctions.find(a => a.id === auctionId);
  if (!auction) return;
  
  if (!window.confirm(`Delete auction "${auction.title}"? This action cannot be undone.`)) return;
  
  try {
    await auctionService.adminDeleteAuction(auctionId);
    setAllAuctions(prev => prev.filter(a => a.id !== auctionId));
    addToast('Auction deleted successfully', 'success');
  } catch (e) {
    addToast(formatApiError(e, 'Failed to delete auction'), 'error');
  }
};

const handleDeleteAuction = async (auctionId) => {
    try {
      await auctionService.deleteAuction(auctionId);
      setAllAuctions(prev => prev.filter(a => a.id !== auctionId));
      addToast('Auction removed', 'success');
    } catch (e) {
      addToast(formatApiError(e, 'Failed to delete auction'), 'error');
    }
  };

  const handleToggleFeatured = async (auctionId) => {
    const currentlyFeatured = featuredAuctionIds.includes(auctionId);
    const next = currentlyFeatured
      ? featuredAuctionIds.filter((id) => id !== auctionId)
      : [auctionId, ...featuredAuctionIds].slice(0, 12);
    try {
      const saved = await adminService.setFeaturedAuctions(next);
      setFeaturedAuctionIds(saved);
      addToast(currentlyFeatured ? 'Removed from featured' : 'Added to featured', 'success');
    } catch (e) {
      addToast(formatApiError(e, 'Failed to update featured auctions'), 'error');
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') return <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest">Admin</span>;
    if (role === 'seller') return <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest">Seller</span>;
    if (role === 'banned') return <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest">Banned</span>;
    return <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest">User</span>;
  };

  const handleDeactivateCategory = async (category) => {
    if (!window.confirm(`Deactivate category "${category.name}"? This will make it inactive but won't delete it permanently.`)) return;
    try {
      await categoryService.deactivateCategory(category.id);
      addToast('Category deactivated successfully', 'success');
      fetchAdminData();
    } catch (e) {
      addToast(formatApiError(e, 'Failed to deactivate category'), 'error');
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`Permanently delete category "${category.name}"? This action cannot be undone and will set category_id to NULL for all auctions using this category.`)) return;
    try {
      await categoryService.deleteCategory(category.id);
      addToast('Category deleted permanently', 'success');
      fetchAdminData();
    } catch (e) {
      addToast(formatApiError(e, 'Failed to delete category'), 'error');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return addToast('Category name is required', 'error');
    try {
      const payload = {
        name: newCategory.name.trim(),
        parent_category_id: newCategory.parent_category_id || null
      };
      
      const response = await categoryService.createCategory(payload);
      addToast('Category created successfully', 'success');
      setNewCategory({ name: '', parent_category_id: null });
      setShowCreateCategory(false);
      fetchAdminData();
    } catch (e) {
      addToast(formatApiError(e, 'Failed to create category'), 'error');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-32 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Access Denied</h1>
        <p className="text-slate-500 font-medium max-w-md">You do not have the required clearance level to access this sector.</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    !userSearch || 
    u.username?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.profile?.full_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const navItems = [
    { id: 'overview', icon: <Activity className="w-4 h-4" />, label: 'Overview' },
    { id: 'users', icon: <Users className="w-4 h-4" />, label: 'User Directory', badge: users.length },
    { id: 'auctions', icon: <TrendingUp className="w-4 h-4" />, label: 'All Auctions', badge: allAuctions.length },
    { id: 'categories', icon: <FileText className="w-4 h-4" />, label: 'Categories', badge: 0 },
    { id: 'reports', icon: <ShieldAlert className="w-4 h-4" />, label: 'Reported Listings', badge: reports.length },
    { id: 'fraud', icon: <AlertTriangle className="w-4 h-4" />, label: 'Fraud Monitor', badge: fraudFlags.length },
    { id: 'logs', icon: <ScrollText className="w-4 h-4" />, label: 'Admin Activity Log', badge: logs.length }
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 dark:bg-slate-950 font-sans flex flex-col md:flex-row border-t border-slate-200 dark:border-slate-800">
      
      {/* Permanent Left Sidebar */}
      <div className="w-full md:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 flex flex-col pt-8 pb-4">
        <div className="px-6 mb-8">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Command Center</h2>
          <p className="font-bold text-slate-900 dark:text-white text-lg">Admin Override</p>
        </div>
        
        <nav className="flex-grow space-y-1 px-3">
          {navItems.map(item => (
            <button 
              key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-bold text-sm tracking-widest uppercase transition-colors ${
                activeTab === item.id 
                  ? 'bg-amber-500 text-slate-900 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">{item.icon} {item.label}</div>
              {item.badge > 0 && <span className={`px-2 py-0.5 rounded text-[10px] font-black ${activeTab === item.id ? 'bg-slate-900 text-amber-500' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-500'}`}>{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="px-6 mt-auto">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
            <p>System Version: 2.1.0-RC</p>
            <p className="mt-1 flex items-center gap-1 text-green-500"><span className="w-2 h-2 rounded-full bg-green-500 block"></span> API Online</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow p-8 overflow-y-auto w-full">
        
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="animate-in fade-in">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">Global Statistics</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Users</p>
                <div className="flex items-end gap-3"><p className="text-3xl font-mono font-black text-slate-900 dark:text-white">{users.length}</p></div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm border-l-4 border-l-amber-500">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">All Auctions</p>
                <div className="flex items-end gap-3"><p className="text-3xl font-mono font-black text-slate-900 dark:text-white">{allAuctions.length}</p><span className="text-green-500 text-xs font-bold mb-1">{allAuctions.filter(a => a.auction_status === 'active').length} active</span></div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Pending Reports</p>
                <div className="flex items-end gap-3"><p className="text-3xl font-mono font-black text-amber-500">{reports.length}</p></div>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Fraud Flags</p>
                <div className="flex items-end gap-3"><p className="text-3xl font-mono font-black text-red-500">{fraudFlags.length}</p></div>
              </div>
            </div>

            {/* Quick Manual Ban Tool */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm max-w-md">
               <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2"><Ban className="w-4 h-4 text-red-500" /> Manual Sanction Tool</h3>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={banInput} onChange={e=>setBanInput(e.target.value)} 
                   placeholder="Enter User ID or Username..." 
                   className="flex-grow bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500 dark:text-white" 
                 />
                 <button 
                  onClick={() => handleBanUser(banInput)}
                  className="bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs tracking-widest px-4 py-2 rounded transition-colors"
                 >Strike</button>
               </div>
            </div>
          </div>
        )}

        {/* TAB: USERS */}
        {activeTab === 'users' && (
          <div className="animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">User Directory ({users.length})</h1>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..." className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500 dark:text-white" />
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest">Loading users...</div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">ID</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">User / Email</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Role</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Joined</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-500">#{u.id}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{u.profile?.full_name || u.username}</div>
                          <div className="text-sm font-medium text-slate-500 mt-0.5">{u.email} <span className="font-mono text-xs opacity-50 ml-2">@{u.username}</span></div>
                        </td>
                        <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {u.role !== 'banned' && u.role !== 'admin' && (
                              <>
                                <button onClick={() => handleBanUser(u.username)} className="text-xs font-black uppercase tracking-widest text-red-600 hover:text-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded transition-colors">Ban</button>
                                <button onClick={() => handlePromoteAdmin(u.id)} className="text-xs font-black uppercase tracking-widest text-purple-600 hover:text-purple-800 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded transition-colors">Promote</button>
                              </>
                            )}
                            {u.role === 'banned' && (
                              <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 uppercase tracking-widest"><Ban className="w-3.5 h-3.5" /> Suspended</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && <tr><td colSpan="5" className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">No users found</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: ALL AUCTIONS */}
        {activeTab === 'auctions' && (
          <div className="animate-in fade-in">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6">All Auctions ({allAuctions.length})</h1>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">ID</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Title</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Seller</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Price</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Featured</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {allAuctions.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">#{a.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white max-w-[200px] truncate">
                        <Link to={`/auctions/${a.id}`} className="hover:text-amber-500 transition-colors">{a.title}</Link>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-500">
                        <Link to={`/seller/${a.seller_id}`} className="hover:text-amber-500">
                          @{a.seller_username || `user${a.seller_id}`}
                        </Link>
                      </td>
                      <td className="px-6 py-4 font-mono font-black text-amber-500">${a.current_price?.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-widest ${
                          a.auction_status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          a.auction_status === 'ended' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          a.auction_status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>{a.auction_status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleFeatured(a.id)}
                          className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded transition-colors ${
                            featuredAuctionIds.includes(a.id)
                              ? 'bg-amber-500 text-slate-900'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500'
                          }`}
                        >
                          {featuredAuctionIds.includes(a.id) ? 'Featured' : 'Feature'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          {a.auction_status === 'active' && (
                            <button
                              onClick={() => handleAdminCancelAuction(a.id)}
                              className="text-xs font-black uppercase tracking-widest text-orange-600 hover:text-orange-800 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                            >
                              <Ban className="w-3 h-3" /> Cancel
                            </button>
                          )}
                          {a.auction_status !== 'active' && (
                            <button
                              onClick={() => handleAdminDeleteAuction(a.id)}
                              className="text-xs font-black uppercase tracking-widest text-red-600 hover:text-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {allAuctions.length === 0 && <tr><td colSpan="7" className="p-10 text-center font-bold text-slate-500 uppercase tracking-widest">No auctions in the system</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: REPORTS */}
        {activeTab === 'reports' && (
          <div className="animate-in fade-in">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-3">
              <FileText className="w-6 h-6 text-amber-500" /> Reported Listings ({reports.length})
            </h1>

            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest">Scanning internal logs...</div>
              ) : reports.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">All clear</h3>
                  <p className="text-slate-500 font-medium">No active community reports pending review.</p>
                </div>
              ) : (
                reports.map(r => (
                  <div key={r.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <div className="space-y-1">
                          <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">
                            <Link
                              to={`/auctions/${r.auction_id}`}
                              className="hover:text-amber-500 transition-colors break-words"
                            >
                              {r.auction_title || `Auction #${r.auction_id}`}
                            </Link>
                          </h4>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                            Reported by{' '}
                            <Link
                              to={`/seller/${r.reported_by}`}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-amber-500"
                            >
                              @{r.reporter_username || `user${r.reported_by}`}
                            </Link>
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400 shrink-0">{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-4 rounded-lg text-sm border border-slate-100 dark:border-slate-800 font-medium mb-4 whitespace-pre-wrap">{r.reason}</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => handleReportAction(r.id, 'reviewed')} className="text-xs font-black uppercase tracking-widest text-amber-700 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 px-4 py-2 rounded transition-colors border border-amber-200 dark:border-amber-900">Mark reviewed</button>
                        <button type="button" onClick={() => handleReportAction(r.id, 'closed')} className="text-xs font-black uppercase tracking-widest text-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded transition-colors">Dismiss</button>
                        <button
                          type="button"
                          onClick={() => handleCancelAuctionFromReport(r)}
                          className="text-xs font-black uppercase tracking-widest text-red-700 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 px-4 py-2 rounded transition-colors border border-red-200 dark:border-red-900"
                        >
                          Cancel auction
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteReport(r.id)}
                          className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-red-600 px-4 py-2 rounded transition-colors"
                        >
                          Remove report
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: FRAUD FLAGS */}
        {activeTab === 'fraud' && (
          <div className="animate-in fade-in">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" /> Fraud Monitor ({fraudFlags.length})
            </h1>

            {fraudFlags.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
                <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Clean Threat Surface</h3>
                <p className="text-slate-500 font-medium">No fraud flags detected by the system.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Flag ID</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">User</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Reason</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Flagged At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {fraudFlags.map(f => (
                      <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-red-500">#{f.id}</td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">User #{f.user_id}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{f.reason}</td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-slate-500">{new Date(f.flagged_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: ADMIN LOGS */}
        {activeTab === 'logs' && (
          <div className="animate-in fade-in">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-6 flex items-center gap-3">
              <ScrollText className="w-6 h-6 text-slate-500" /> Admin Activity Log
            </h1>
            
            {logs.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
                <ScrollText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">No logs yet</h3>
                <p className="text-slate-500 font-medium">Admin actions will be recorded here automatically.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Admin ID</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Action</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Target</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {logs.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-500">#{l.admin_id}</td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white uppercase text-sm tracking-widest">{l.action}</td>
                        <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">{l.target_type} #{l.target_id}</td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-slate-500">{new Date(l.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="animate-in fade-in">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-3">
                <FileText className="w-6 h-6 text-amber-500" /> Category Management ({categories.length})
              </h1>
              <button 
                onClick={() => setShowCreateCategory(true)}
                className="bg-amber-500 hover:bg-amber-400 text-white font-black uppercase text-xs tracking-widest px-4 py-2 rounded transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create Category
              </button>
            </div>
            
            {/* Categories List */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">ID</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Name</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Parent</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Status</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {categories.map(cat => (
                    <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">#{cat.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{cat.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {cat.parent_category_id ? `#${cat.parent_category_id}` : 'Root'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          cat.is_active 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {cat.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleDeactivateCategory(cat)}
                            className={`text-xs font-bold uppercase tracking-widest px-2 py-1 rounded transition-colors ${
                              cat.is_active 
                                ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400' 
                                : 'text-green-600 hover:text-green-700 dark:text-green-400'
                            }`}
                          >
                            {cat.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button 
                            onClick={() => handleDeleteCategory(cat)}
                            className="text-xs font-bold uppercase tracking-widest px-2 py-1 rounded text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create Category Modal */}
        {showCreateCategory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Create New Category</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Category Name</label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 dark:text-white"
                    placeholder="Enter category name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Parent Category (Optional)</label>
                  <select
                    value={newCategory.parent_category_id || ''}
                    onChange={(e) => setNewCategory({...newCategory, parent_category_id: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-amber-500 dark:text-white"
                  >
                    <option value="">None (Root Category)</option>
                    {categories.filter(cat => cat.is_active).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateCategory(false);
                    setNewCategory({ name: '', parent_category_id: null });
                  }}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase text-xs tracking-widest px-4 py-2 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCategory}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-black uppercase text-xs tracking-widest px-4 py-2 rounded transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

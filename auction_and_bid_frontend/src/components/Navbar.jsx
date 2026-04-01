import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useWs } from '../context/WsContext';
import { notificationService } from '../services/api/notificationService';
import { Gavel, User, LogOut, PlusCircle, Bell, Moon, Sun, Loader2, X, ChevronDown, CheckCircle2, AlertTriangle, Trophy, Wallet, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useCategories } from '../context/CategoryContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isConnected } = useWs();
  const navigate = useNavigate();
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  
  const { categories } = useCategories();
  const [showMegaMenu, setShowMegaMenu] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (e) { console.error(e); }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  };

  const getNotificationStyles = (type) => {
    switch(type) {
      case 'outbid': return { icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, border: 'border-l-amber-500' };
      case 'won': return { icon: <Trophy className="w-5 h-5 text-green-500" />, border: 'border-l-green-500' };
      case 'payment_due': return { icon: <Wallet className="w-5 h-5 text-red-500" />, border: 'border-l-red-500' };
      default: return { icon: <Gavel className="w-5 h-5 text-slate-500" />, border: 'border-l-slate-400' };
    }
  };

  return (
    <>
      <nav className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-200 font-sans">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Logo & Mega Menu Trigger */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-2xl tracking-tight uppercase hover:text-amber-500 dark:hover:text-amber-500 transition-colors">
              <Gavel className="w-7 h-7 text-amber-500 mb-1" />
              PrimeAuctions
            </Link>

            <div 
              className="relative hidden lg:block"
              onMouseEnter={() => setShowMegaMenu(true)}
              onMouseLeave={() => setShowMegaMenu(false)}
            >
              <button className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-500 transition-colors h-16">
                Browse <ChevronDown className="w-4 h-4 ml-1" />
              </button>
              
              {/* Mega Menu Dropdown */}
              {showMegaMenu && (
                <div className="absolute top-16 left-0 w-[600px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-b-xl p-8 grid grid-cols-2 gap-6 z-50 animate-in slide-in-from-top-2">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Vehicles</h3>
                    <ul className="space-y-3">
                      {categories.map(c => (
                        <li key={c.id}>
                          <Link to={`/?category_id=${c.id}`} className="font-bold text-slate-700 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-500 transition-colors">
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-lg border border-slate-100 dark:border-slate-800">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Editor's Choice</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">Discover the most pristine, verified classics hitting the block perfectly curated this week.</p>
                    <Link to="/" className="text-amber-600 dark:text-amber-500 font-bold hover:underline">View Curated List →</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2 mr-2" title={isConnected ? "WebSocket Live" : "Reconnecting/Offline"}>
              {isConnected ? (
                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
              ) : (
                <Loader2 className="w-4 h-4 text-slate-300 dark:text-slate-600 animate-spin" />
              )}
            </div>

            <button 
              onClick={toggleTheme} 
              className="text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <>
                <Link to="/create" className="text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 flex items-center gap-1 font-bold transition-colors uppercase tracking-wide text-sm">
                  <PlusCircle className="w-4 h-4" /> <span className="hidden sm:inline">Sell</span>
                </Link>

                <button 
                  onClick={() => setIsNotifOpen(true)}
                  className="text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 flex items-center transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <Link to="/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 flex items-center gap-1 font-bold transition-colors uppercase tracking-wide text-sm ml-2">
                  <User className="w-5 h-5" /> <span className="hidden sm:inline">Account</span>
                </Link>

                {user.role === 'admin' && (
                  <Link to="/admin" className="ml-2 bg-slate-900 border border-amber-500/30 text-amber-500 hover:bg-slate-800 flex items-center gap-1.5 font-black uppercase tracking-widest text-[10px] sm:text-xs px-3 py-1.5 rounded shadow-sm shadow-amber-500/10 transition-colors">
                    <Shield className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}

                <button 
                  onClick={() => { logout(); navigate('/'); }}
                  className="text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 font-bold transition-colors uppercase tracking-wide text-sm ml-4"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 font-bold transition-colors uppercase tracking-wide text-sm">Login</Link>
                <Link to="/register" className="bg-amber-500 hover:bg-amber-400 text-slate-900 px-5 py-2 rounded-lg text-sm font-black uppercase tracking-widest transition-colors shadow-lg shadow-amber-500/20">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Notifications Drawer Overlay */}
      {isNotifOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end font-sans">
          <div className="w-[400px] h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-right-full duration-300">
            
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" /> Notifications
              </h2>
              <div className="flex gap-4 items-center">
                {unreadCount > 0 && <button onClick={handleMarkAllRead} className="text-xs font-bold text-slate-500 hover:text-amber-500 uppercase tracking-widest transition-colors"><CheckCircle2 className="inline w-4 h-4 mr-1 mb-0.5"/>Mark All Read</button>}
                <button onClick={() => setIsNotifOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="text-center py-20 text-slate-500 dark:text-slate-400">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="font-bold">You're all caught up.</p>
                </div>
              ) : (
                notifications.map(n => {
                  const style = getNotificationStyles(n.type);
                  return (
                    <div 
                      key={n.id} 
                      onClick={() => { if(!n.is_read) handleMarkAsRead(n.id); navigate(`/auctions/${n.auction_id || ''}`); setIsNotifOpen(false); }}
                      className={`cursor-pointer group relative bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md ${!n.is_read ? `border-l-4 ${style.border} dark:bg-slate-800/50` : ''}`}
                    >
                      <div className="flex gap-4">
                        <div className={`mt-1 transition-opacity ${n.is_read ? 'opacity-40' : 'opacity-100'}`}>{style.icon}</div>
                        <div className="flex-grow">
                          <p className={`text-sm ${n.is_read ? 'text-slate-600 dark:text-slate-400 font-medium' : 'text-slate-900 dark:text-white font-bold'}`}>
                            {n.message}
                          </p>
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">
                            {formatDistanceToNow(new Date(n.created_at))} ago
                          </p>

                          {n.type === 'outbid' && <div className="mt-3 text-sm font-bold text-amber-600 dark:text-amber-500 hover:underline">Bid again →</div>}
                          {n.type === 'won' && <div className="mt-3 inline-block bg-green-500 text-white font-bold px-4 py-1.5 rounded uppercase tracking-wider text-xs">Pay now →</div>}
                          {n.type === 'payment_due' && <div className="mt-3 inline-block bg-red-600 text-white font-bold px-4 py-1.5 rounded uppercase tracking-wider text-xs shadow-lg shadow-red-500/20">Complete payment →</div>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}

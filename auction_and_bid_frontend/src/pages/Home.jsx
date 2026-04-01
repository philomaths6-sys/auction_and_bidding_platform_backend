import React, { useState, useEffect } from 'react';
import { auctionService } from '../services/api/auctionService';
import AuctionCard from '../components/AuctionCard';
import { Loader2, Search, Filter, SlidersHorizontal, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoryContext';
import { normalizeAuction } from '../services/api/adapters';

export default function Home() {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState([]);
  const { categoryById, categoryRoots } = useCategories();
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryId, setCategoryId] = useState(null);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // Sort State
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'ending_soonest' | 'price_asc' | 'price_desc' | 'most_bids'
  
  // Mobile Sidebar Toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // categories are loaded globally via CategoryProvider
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const activeFilters = {};
      if (statusFilter !== 'all') activeFilters.status = statusFilter;
      if (categoryId) activeFilters.category_id = categoryId;
      if (minPrice) activeFilters.min_price = minPrice;
      if (maxPrice) activeFilters.max_price = maxPrice;

      let data = await auctionService.getAuctions(0, 200, activeFilters);
      data = (data || []).map((a) => normalizeAuction(a, categoryById));
      
      // Client-side text search over title/description (backend doesn't support full-text search out of box yet)
      if (debouncedSearch) {
        data = data.filter(a => 
          a.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          a.description.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
      }

      // Sort (backend AuctionResponse does not include created_at; use start_time instead)
      if (sortBy === 'newest') data.sort((a,b) => new Date(b.start_time) - new Date(a.start_time));
      if (sortBy === 'ending_soonest') data.sort((a,b) => new Date(a.end_time) - new Date(b.end_time));
      if (sortBy === 'price_asc') data.sort((a,b) => (a.current_price || 0) - (b.current_price || 0));
      if (sortBy === 'price_desc') data.sort((a,b) => (b.current_price || 0) - (a.current_price || 0));
      if (sortBy === 'most_bids') data.sort((a,b) => (b.total_bids || 0) - (a.total_bids || 0));

      setAuctions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, [statusFilter, categoryId, minPrice, maxPrice, debouncedSearch, sortBy]);

  const clearFilters = () => {
    setSearchTerm(''); setDebouncedSearch(''); setStatusFilter('active');
    setCategoryId(null); setMinPrice(''); setMaxPrice(''); setSortBy('newest');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-[1400px] mx-auto min-h-screen">
      
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center gap-2 sticky top-16 z-30 bg-white dark:bg-slate-950 py-4 border-b border-slate-200 dark:border-slate-800">
        <button onClick={() => setSidebarOpen(true)} className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-700 dark:text-slate-300">
          <Filter className="w-5 h-5" />
        </button>
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" placeholder="Search auctions..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* LEFT SIDEBAR (Desktop & Mobile Drawer) */}
      <div className={`fixed inset-y-0 left-0 z-40 w-[280px] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-6 transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:z-0 lg:w-[280px] lg:flex-shrink-0 ${sidebarOpen ? 'translate-x-0 overflow-y-auto' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center mb-8 lg:hidden">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-amber-500"/> Filters</h2>
          <button onClick={() => setSidebarOpen(false)}><X className="w-6 h-6 text-slate-500" /></button>
        </div>

        <div className="hidden lg:block mb-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow"
          />
        </div>

        <div className="space-y-8">
          {/* Status Filters */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Status</h3>
            <div className="space-y-2">
              {['active', 'ended', 'all'].map(status => (
                <button 
                  key={status} onClick={() => setStatusFilter(status)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors ${statusFilter === status ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-500' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'}`}
                >
                  {status === 'active' ? '🟢 Live' : status === 'ended' ? '🏁 Ended' : 'All Auctions'}
                </button>
              ))}
              {user && user.role === 'seller' && (
                <button 
                  onClick={() => setStatusFilter('draft')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors ${statusFilter === 'draft' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-500' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'}`}
                >
                  📝 My Drafts
                </button>
              )}
            </div>
          </div>

          {/* Categories Structure */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Categories</h3>
            <div className="space-y-1">
              <button 
                onClick={() => setCategoryId(null)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-semibold transition-colors ${!categoryId ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900/50'}`}
              >
                All Categories
              </button>
              {categoryRoots.map(parent => (
                <div key={parent.id} className="space-y-1">
                  <button 
                    onClick={() => setCategoryId(parent.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${categoryId === parent.id ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900/50'}`}
                  >
                    {categoryId === parent.id ? <ChevronDown className="w-4 h-4 text-amber-500" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                    {parent.name}
                  </button>

                  {parent.children?.length > 0 && (
                    <div className="ml-5 border-l border-slate-200 dark:border-slate-800 pl-2 space-y-1">
                      {parent.children.map(child => (
                        <button
                          key={child.id}
                          onClick={() => setCategoryId(child.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${categoryId === child.id ? 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-500' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900/50'}`}
                        >
                          {child.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Price Range</h3>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="Min" value={minPrice} onChange={e=>setMinPrice(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500" />
              <span className="text-slate-400">-</span>
              <input type="number" placeholder="Max" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)}></div>}

      {/* MAIN CONTENT AREA */}
      <div className="flex-grow pt-4">
        
        {/* Sticky Sort Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
            Showing <span className="text-slate-900 dark:text-white">{auctions.length}</span> Results
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sort:</span>
            <select 
              value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-transparent border-none text-slate-900 dark:text-white font-bold text-sm uppercase tracking-wide focus:ring-0 cursor-pointer outline-none"
            >
              <option value="newest" className="text-slate-900 font-sans">Newest</option>
              <option value="ending_soonest" className="text-slate-900 font-sans">Ending Soonest</option>
              <option value="price_asc" className="text-slate-900 font-sans">Price: Low to High</option>
              <option value="price_desc" className="text-slate-900 font-sans">Price: High to Low</option>
              <option value="most_bids" className="text-slate-900 font-sans">Most Bids</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-40"><Loader2 className="w-12 h-12 text-amber-500 animate-spin" /></div>
        ) : auctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">
            {auctions.map(auction => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-6">
              <Search className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">No auctions match your filters</h3>
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 max-w-sm">Try broadening your search or clearing active category and price constraints.</p>
            <button 
              onClick={clearFilters}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold uppercase tracking-widest px-8 py-3 rounded-lg hover:scale-105 transition-transform"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

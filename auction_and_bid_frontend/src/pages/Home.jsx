import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { auctionService } from '../services/api/auctionService';
import AuctionCard from '../components/AuctionCard';
import Pagination from '../components/Pagination';
import { Loader2, Search, Menu, SlidersHorizontal, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../context/CategoryContext';
import { normalizeAuction } from '../services/api/adapters';

function flattenCategoryTree(roots) {
  const out = [];
  for (const r of roots || []) {
    out.push(r);
    (r.children || []).forEach((c) => out.push(c));
  }
  return out;
}

export default function Home() {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState([]);
  const { categoryById, categoryRoots, loading: categoriesLoading } = useCategories();
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  /** Filter drawer: closed on mobile by default, open on desktop (synced on resize). */
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => setFiltersOpen(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const findCategoryIdByName = useCallback(
    (rawName) => {
      if (!rawName) return null;
      const decoded = decodeURIComponent(rawName.trim());
      const flat = flattenCategoryTree(categoryRoots);
      const found = flat.find((c) => c.name === decoded);
      return found ? found.id : null;
    },
    [categoryRoots]
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);


  useEffect(() => {
    const s = searchParams.get('search');
    if (s !== null) setSearchTerm(s);
  }, [searchParams]);

  const categoryFilterId = useMemo(() => {
    if (categoriesLoading) return null;
    const catName = searchParams.get('category');
    const legacyId = searchParams.get('category_id');
    if (catName) {
      const id = findCategoryIdByName(catName);
      return id;
    }
    if (legacyId) {
      const id = parseInt(legacyId, 10);
      return Number.isFinite(id) ? id : null;
    }
    return null;
  }, [searchParams, categoriesLoading, findCategoryIdByName]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, categoryFilterId, minPrice, maxPrice, sortBy]);

  const setCategoryFilter = (id) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id == null) {
        next.delete('category');
        next.delete('category_id');
      } else {
        const cat = categoryById.get(id);
        if (cat?.name) {
          next.set('category', cat.name);
          next.delete('category_id');
        }
      }
      return next;
    });
  };

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    try {
      const activeFilters = {};
      if (statusFilter && statusFilter !== 'all') activeFilters.status = statusFilter;
      
      // Handle category filtering - include child categories if parent is selected
      if (categoryFilterId) {
        const category = categoryById.get(categoryFilterId);
        if (category?.children?.length > 0) {
          // If parent category selected, include all child categories
          const allCategoryIds = [categoryFilterId, ...category.children.map(child => child.id)];
          activeFilters.category_ids = allCategoryIds;
        } else {
          // If child category selected, filter by exact category
          activeFilters.category_id = categoryFilterId;
        }
      }
      
      if (minPrice) activeFilters.min_price = minPrice;
      if (maxPrice) activeFilters.max_price = maxPrice;

      let data = await auctionService.getAuctions(0, 200, activeFilters);
      data = (data || []).map((a) => normalizeAuction(a, categoryById));

      // If backend doesn't support category_ids filter, apply frontend filtering
      if (categoryFilterId && activeFilters.category_ids) {
        const category = categoryById.get(categoryFilterId);
        if (category?.children?.length > 0) {
          // Filter on frontend to include auctions from parent and child categories
          const allCategoryIds = [categoryFilterId, ...category.children.map(child => child.id)];
          data = data.filter(auction => allCategoryIds.includes(auction.category_id));
        }
      }

      if (debouncedSearch) {
        data = data.filter(
          (a) =>
            a.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (a.description || '').toLowerCase().includes(debouncedSearch.toLowerCase())
        );
      }

      if (sortBy === 'newest') data.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
      if (sortBy === 'ending_soonest') data.sort((a, b) => new Date(a.end_time) - new Date(b.end_time));
      if (sortBy === 'price_asc') data.sort((a, b) => (a.current_price || 0) - (b.current_price || 0));
      if (sortBy === 'price_desc') data.sort((a, b) => (b.current_price || 0) - (a.current_price || 0));
      if (sortBy === 'most_bids') data.sort((a, b) => (b.total_bids || 0) - (a.total_bids || 0));

      setAuctions(data);
    } catch (err) {
      console.error('❌ Error fetching auctions:', err);
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    categoryFilterId,
    minPrice,
    maxPrice,
    debouncedSearch,
    sortBy,
    categoryById,
  ]);

  useEffect(() => {
    if (categoriesLoading) return;
    fetchAuctions();
  }, [categoriesLoading, fetchAuctions]);

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('active');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('category');
      next.delete('category_id');
      return next;
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-screen px-4 pb-8 lg:px-6">
      <div className="lg:hidden flex items-center gap-2 sticky top-16 z-30 bg-slate-950 py-4 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="p-3 bg-slate-900 rounded-lg text-slate-300 hover:text-amber-400 border border-slate-800"
          aria-label="Open filters"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input
            type="text"
            placeholder="Search auctions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <div
        id="auction-filters-panel"
        className={`fixed inset-y-0 left-0 z-40 w-[min(280px,85vw)] bg-slate-950 border-r border-slate-800 p-6 transform transition-transform duration-300 ease-in-out overflow-y-auto lg:relative lg:inset-auto lg:z-0 lg:w-[280px] lg:flex-shrink-0 lg:translate-x-0 lg:max-w-none ${
          filtersOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
        }`}
      >
        <div className="flex justify-between items-center mb-8 lg:mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2 text-white">
            <SlidersHorizontal className="w-5 h-5 text-amber-500" aria-hidden />
            Filters
          </h2>
          <button type="button" onClick={() => setFiltersOpen(false)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden" aria-label="Close filters">
            <X className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="hidden lg:flex p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="hidden lg:block mb-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow"
          />
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Status</h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'text-slate-400 hover:bg-slate-900'
                }`}
              >
                All Auctions
              </button>
              {['active', 'ended'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors ${
                    statusFilter === status
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  {status === 'active' ? '🟢 Live' : '🏁 Ended'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Categories</h3>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-semibold transition-colors ${
                  !categoryFilterId ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900/50'
                }`}
              >
                All Categories
              </button>
              {categoryRoots.map((parent) => (
                <div key={parent.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter(parent.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
                      categoryFilterId === parent.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-900/50'
                    }`}
                  >
                    {categoryFilterId === parent.id ? (
                      <ChevronDown className="w-4 h-4 text-amber-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    )}
                    {parent.name}
                    {parent.children?.length > 0 && (
                      <span className="text-xs text-slate-500 ml-auto">(+{parent.children.length})</span>
                    )}
                  </button>

                  {parent.children?.length > 0 && categoryFilterId === parent.id && (
                    <div className="ml-5 text-xs text-amber-500 font-medium px-3 py-1">
                      Includes all subcategories
                    </div>
                  )}
                  {parent.children?.length > 0 && (
                    <div className="ml-5 border-l border-slate-800 pl-2 space-y-1">
                      {parent.children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => setCategoryFilter(child.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2 ${
                            categoryFilterId === child.id
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'text-slate-400 hover:bg-slate-900/50'
                          }`}
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

          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Price Range</h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <span className="text-slate-500">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {filtersOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setFiltersOpen(false)} role="presentation" />}

      <div className="flex-grow pt-4 min-w-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="hidden lg:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
              aria-expanded={filtersOpen}
              aria-controls="auction-filters-panel"
            >
              <Menu className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">Filters</span>
            </button>
            <div className="text-sm font-bold text-slate-400 tracking-wide uppercase">
              Showing <span className="text-white">{auctions.length}</span> Results
            </div>
          </div>
          <div className="w-full max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search auctions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-medium text-slate-100 focus:outline-none focus:ring-0 transition-all duration-300 focus:border-amber-500 focus:shadow-[0_0_0_2px_rgba(232,192,64,0.25)] focus:scale-[1.02]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none text-white font-bold text-sm uppercase tracking-wide focus:ring-0 cursor-pointer outline-none"
            >
              <option value="newest" className="bg-slate-900 font-sans">
                Newest
              </option>
              <option value="ending_soonest" className="bg-slate-900 font-sans">
                Ending Soonest
              </option>
              <option value="price_asc" className="bg-slate-900 font-sans">
                Price: Low to High
              </option>
              <option value="price_desc" className="bg-slate-900 font-sans">
                Price: High to Low
              </option>
              <option value="most_bids" className="bg-slate-900 font-sans">
                Most Bids
              </option>
            </select>
          </div>
        </div>

        {loading || categoriesLoading ? (
          <div className="flex justify-center items-center py-40">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
          </div>
        ) : auctions.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-end">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 pl-3 border-l-2 border-amber-500" style={{ fontSize: '12px' }}>All auctions</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 auto-rows-max">
              {auctions.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((auction) => (
                <AuctionCard 
                  key={auction.id} 
                  auction={auction} 
                />
              ))}
            </div>
            <Pagination
              totalItems={auctions.length}
              pageSize={pageSize}
              currentPage={currentPage}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
            <div className="bg-slate-800 p-6 rounded-full mb-6">
              <Search className="w-12 h-12 text-slate-500" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight mb-2">No auctions match your filters</h3>
            <p className="text-slate-400 text-lg mb-8 max-w-sm">
              Try broadening your search or clearing active category and price constraints.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="bg-white text-slate-900 font-bold uppercase tracking-widest px-8 py-3 rounded-lg hover:scale-105 transition-transform"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

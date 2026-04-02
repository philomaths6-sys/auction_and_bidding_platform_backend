import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import AuctionCard from '../components/AuctionCard';
import Pagination from '../components/Pagination';
import { auctionService } from '../services/api/auctionService';
import { useCategories } from '../context/CategoryContext';
import { normalizeAuction } from '../services/api/adapters';

export default function FeaturedHome() {
  const { categoryById, categories } = useCategories();
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState([]);
  const [latest, setLatest] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchPage, setSearchPage] = useState(1);
  const [pageSize] = useState(12);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const featuredSliderRef = useRef(null);

  // Get parent categories (categories without parents)
  const parentCategories = useMemo(() => {
    return categories?.filter(cat => !cat.parent_id).slice(0, 5) || [];
  }, [categories]);

  // Scroll-triggered animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => observer.observe(el));

    return () => {
      animatedElements.forEach(el => observer.unobserve(el));
    };
  }, [loading, featured, latest, parentCategories]);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const parallaxElements = document.querySelectorAll('.parallax-slow');
      
      parallaxElements.forEach(el => {
        const speed = el.dataset.speed || 0.5;
        el.style.transform = `translateY(${scrolled * speed}px)`;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mouse tracking for hover effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      const hoverElements = document.querySelectorAll('.hover-glow');
      hoverElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        el.parentElement.style.setProperty('--mouse-x', `${x}%`);
        el.parentElement.style.setProperty('--mouse-y', `${y}%`);
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Auto-rotate featured auctions
  useEffect(() => {
    if (featured.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentFeaturedIndex((prev) => (prev + 1) % featured.length);
    }, 5000); // Change every 5 seconds
    
    return () => clearInterval(interval);
  }, [featured.length]);

  const goToFeatured = (index) => {
    setCurrentFeaturedIndex(index);
  };

  const nextFeatured = () => {
    setCurrentFeaturedIndex((prev) => (prev + 1) % featured.length);
  };

  const prevFeatured = () => {
    setCurrentFeaturedIndex((prev) => (prev - 1 + featured.length) % featured.length);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await auctionService.getHomeFeed(3, 6);
        if (!mounted) return;
        setFeatured((data?.featured || []).map((a) => normalizeAuction(a, categoryById)));
        setLatest((data?.latest || []).map((a) => normalizeAuction(a, categoryById)));
      } catch (e) {
        if (!mounted) return;
        setFeatured([]);
        setLatest([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [categoryById]);

  useEffect(() => {
    setSearchPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!debouncedSearch) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      setSearchLoading(true);
      try {
        const data = await auctionService.searchAuctions(debouncedSearch, 0, 24);
        if (!mounted) return;
        setSearchResults((data || []).map((a) => normalizeAuction(a, categoryById)));
      } catch (e) {
        if (!mounted) return;
        setSearchResults([]);
      } finally {
        if (mounted) setSearchLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [debouncedSearch, categoryById]);

  const showSearch = debouncedSearch.length > 0;

  const browseAllHref = useMemo(() => {
    if (!debouncedSearch) return '/auctions';
    return `/auctions?search=${encodeURIComponent(debouncedSearch)}`;
  }, [debouncedSearch]);

  return (
    <div className="px-4 py-2 min-h-screen lg:px-6 scroll-smooth">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
        <div>
          <p className="text-slate-400 mt-2">Curated by admins. Search all listings without leaving home.</p>
        </div>
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input
            type="search"
            placeholder="Search auctions by title or description…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {showSearch ? (
        <section className="space-y-4 mb-12">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-amber-500">
              Search results · “{debouncedSearch}”
            </h2>
            <Link
              to={browseAllHref}
              className="text-xs font-bold text-slate-300 hover:text-amber-500 uppercase tracking-widest"
            >
              Open in browse →
            </Link>
          </div>
          {searchLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center text-slate-400">
              No auctions match that search. Try different keywords or{' '}
              <Link to="/auctions" className="text-amber-500 font-bold hover:underline">
                browse all filters
              </Link>
              .
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {searchResults.slice((searchPage - 1) * pageSize, searchPage * pageSize).map((auction) => (
                  <AuctionCard key={auction.id} auction={auction} />
                ))}
              </div>
              <Pagination
                totalItems={searchResults.length}
                pageSize={pageSize}
                currentPage={searchPage}
                onPageChange={(p) => setSearchPage(p)}
              />
            </>
          )}
        </section>
      ) : null}

      {loading ? (
        <div className="py-24 flex justify-center">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          <section className="animate-fade-in">
            <div className="flex items-center justify-between opacity-0 animate-slide-down">
              <h2 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-4">Featured</h2>
              <Link to="/auctions" className="text-amber-500 hover:text-amber-400 font-bold uppercase tracking-widest text-xs">
                View all auctions →
              </Link>
            </div>
            {featured.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center text-slate-400">
                No featured auctions selected by admin yet.
              </div>
            ) : (
              <div className="relative opacity-0 animate-scale-in">
                {/* Main Featured Auction Display */}
                <div className="relative overflow-hidden rounded-xl" style={{ minHeight: '50vh' }}>
                  <div 
                    ref={featuredSliderRef}
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${currentFeaturedIndex * 100}%)` }}
                  >
                    {featured.map((auction, index) => (
                      <div key={auction.id} className="w-full flex-shrink-0">
                        <AuctionCard auction={auction} variant="featured" style={{ minHeight: '50vh' }} />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Navigation Controls */}
                {featured.length > 1 && (
                  <>
                    {/* Previous Button */}
                    <button
                      onClick={prevFeatured}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
                      aria-label="Previous featured auction"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    {/* Next Button */}
                    <button
                      onClick={nextFeatured}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-10"
                      aria-label="Next featured auction"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    
                    {/* Dot Indicators */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                      {featured.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToFeatured(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentFeaturedIndex 
                              ? 'bg-amber-500' 
                              : 'bg-white/50 hover:bg-white/70'
                          }`}
                          aria-label={`Go to featured auction ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
                
                {/* Featured Counter */}
                {featured.length > 1 && (
                  <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium z-10">
                    {currentFeaturedIndex + 1} / {featured.length}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Glassy Bar */}
          <div style={{ 
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 20%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.1) 80%, transparent 100%)',
            backdropFilter: 'blur(10px)',
            marginTop: '10px',
            marginBottom: '10px',
            position: 'relative'
          }} className="opacity-0 animate-fade-in">
            <span style={{
              position: 'absolute',
              top: '0',
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
              animation: 'shimmer 4s infinite'
            }}></span>
          </div>

          {/* Categories Section */}
          <div style={{ marginTop: '65px' }} className="opacity-0 animate-fade-in-up">
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '32px',
              flexWrap: 'wrap',
              paddingLeft: '40px',
              paddingRight: '40px'
            }}>
              {parentCategories.map((category, index) => (
                <Link
                  key={category.id}
                  to={`/auctions?category=${category.id}`}
                  style={{
                    background: 'rgba(30, 30, 46, 0.6)',
                    backdropFilter: 'blur(20px) saturate(160%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '25px',
                    padding: '10px 20px',
                    color: '#e2e8f0',
                    fontSize: '13px',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                    textDecoration: 'none',
                    position: 'relative',
                    overflow: 'hidden',
                    transform: 'translateY(0) scale(1)'
                  }}
                  className="glass hover:scale-105 animate-on-scroll slide-up"
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                    e.target.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 20px rgba(245, 158, 11, 0.1)';
                    e.target.style.transform = 'translateY(-3px) scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.target.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)';
                    e.target.style.transform = 'translateY(0) scale(1)';
                  }}
                  onClick={(e) => {
                    // Click ripple effect
                    const ripple = document.createElement('span');
                    ripple.style.position = 'absolute';
                    ripple.style.width = '20px';
                    ripple.style.height = '20px';
                    ripple.style.background = 'rgba(255, 255, 255, 0.3)';
                    ripple.style.borderRadius = '50%';
                    ripple.style.transform = 'translate(-50%, -50%)';
                    ripple.style.pointerEvents = 'none';
                    ripple.style.animation = 'ripple 0.6s ease-out';
                    
                    const rect = e.target.getBoundingClientRect();
                    ripple.style.left = `${e.clientX - rect.left}px`;
                    ripple.style.top = `${e.clientY - rect.top}px`;
                    
                    e.target.appendChild(ripple);
                    setTimeout(() => ripple.remove(), 600);
                  }}
                >
                  {/* Glassy boundary effect */}
                  <span style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    borderRadius: '25px',
                    padding: '1px',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 25%, rgba(255, 255, 255, 0.02) 50%, rgba(255, 255, 255, 0.05) 75%, rgba(255, 255, 255, 0.1) 100%)',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    pointerEvents: 'none'
                  }}></span>
                  
                  {/* Animated shimmer */}
                  <span style={{
                    position: 'absolute',
                    top: '0',
                    left: '-200%',
                    width: '200%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
                    animation: 'shimmer 6s infinite',
                    pointerEvents: 'none'
                  }}></span>
                  
                  {/* Hover glow effect */}
                  <span style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    bottom: '0',
                    borderRadius: '25px',
                    background: 'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(245, 158, 11, 0.1) 0%, transparent 50%)',
                    pointerEvents: 'none',
                    opacity: '0',
                    transition: 'opacity 0.3s ease'
                  }} className="hover-glow"></span>
                  
                  {category.name}
                </Link>
              ))}
            </div>
          </div>

          <section className="opacity-0 animate-fade-in" style={{ marginTop: '75px' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 animate-on-scroll slide-down">Latest Auctions</h2>
              <Link to="/auctions" className="text-xs font-bold text-slate-300 hover:text-amber-500 uppercase tracking-widest animate-on-scroll slide-down" style={{ transition: 'all 0.3s ease' }}>
                See all
              </Link>
            </div>
            {latest.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center text-slate-400 animate-on-scroll scale">
                No active auctions right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {latest.map((auction, index) => (
                  <div key={auction.id} className="animate-on-scroll scale" style={{ animationDelay: `${index * 100}ms` }}>
                    <AuctionCard auction={auction} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

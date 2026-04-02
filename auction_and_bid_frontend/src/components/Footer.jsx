import { Link } from 'react-router-dom';
import { Gavel } from 'lucide-react';

export default function Footer({ showHowItWorks = false }) {
  return (
    <footer className="mt-auto border-t border-white/10 bg-slate-950/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-10">
        {/* How It Works Section - Only on Home Page */}
        {showHowItWorks && (
          <div className="mb-12">
            <h2 style={{ 
              fontSize: '14px', 
              fontWeight: 'bold', 
              color: '#9ca3af', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              How It Works
            </h2>
            <div style={{ 
              display: 'flex', 
              gap: '30px',
              justifyContent: 'space-between',
              paddingLeft: '80px',
              paddingRight: '80px'
            }}>
              {/* Card 1: Browse Listings */}
              <div style={{
                background: '#1A1B28',
                borderRadius: '12px',
                padding: '16px 16px',
                flex: '1',
                maxWidth: '220px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  color: '#0a0a0f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  margin: '0 auto 10px auto'
                }}>
                  1
                </div>
                <h3 style={{
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  Browse Listings
                </h3>
                <p style={{
                  color: '#6b7280',
                  fontSize: '11px',
                  lineHeight: '1.3'
                }}>
                  Discover unique items from trusted sellers
                </p>
              </div>

              {/* Card 2: Place Your Bid */}
              <div style={{
                background: '#1A1B28',
                borderRadius: '12px',
                padding: '16px 16px',
                flex: '1',
                maxWidth: '220px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  color: '#0a0a0f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  margin: '0 auto 10px auto'
                }}>
                  2
                </div>
                <h3 style={{
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  Place Your Bid
                </h3>
                <p style={{
                  color: '#6b7280',
                  fontSize: '11px',
                  lineHeight: '1.3'
                }}>
                  Compete for items you want with competitive bidding
                </p>
              </div>

              {/* Card 3: Win & Collect */}
              <div style={{
                background: '#1A1B28',
                borderRadius: '12px',
                padding: '16px 16px',
                flex: '1',
                maxWidth: '220px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#f59e0b',
                  color: '#0a0a0f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  margin: '0 auto 10px auto'
                }}>
                  3
                </div>
                <h3 style={{
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  Win & Collect
                </h3>
                <p style={{
                  color: '#6b7280',
                  fontSize: '11px',
                  lineHeight: '1.3'
                }}>
                  Secure your winning item and arrange collection
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 text-white font-black text-xl tracking-tight uppercase hover:text-amber-500 transition-colors">
              <Gavel className="w-6 h-6 text-amber-500" />
              PrimeAuctions
            </Link>
            <p className="mt-3 text-sm text-slate-400 max-w-sm leading-relaxed">
              Live auctions with secure checkout. Browse, bid, and sell with confidence.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <h3 className="font-black uppercase tracking-widest text-slate-500 text-xs mb-3">Browse</h3>
              <ul className="space-y-2 font-semibold text-slate-300">
                <li><Link to="/" className="hover:text-amber-500 transition-colors">Home</Link></li>
                <li><Link to="/watchlist" className="hover:text-amber-500 transition-colors">Watchlist</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-black uppercase tracking-widest text-slate-500 text-xs mb-3">Account</h3>
              <ul className="space-y-2 font-semibold text-slate-300">
                <li><Link to="/dashboard" className="hover:text-amber-500 transition-colors">Dashboard</Link></li>
                <li><Link to="/create" className="hover:text-amber-500 transition-colors">Sell</Link></li>
                <li><Link to="/settings" className="hover:text-amber-500 transition-colors">Settings</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-black uppercase tracking-widest text-slate-500 text-xs mb-3">Legal</h3>
              <ul className="space-y-2 font-semibold text-slate-300">
                <li><span className="text-slate-500 cursor-default">Terms</span></li>
                <li><span className="text-slate-500 cursor-default">Privacy</span></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/5 text-center text-xs text-slate-500 font-medium">
          © {new Date().getFullYear()} PrimeAuctions. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

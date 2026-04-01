import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Gavel, Loader2, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      await login(email, password);
      const redirectTo = location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err.response?.status === 403 || err.response?.data?.detail?.includes('suspended') || err.response?.data?.detail?.includes('banned')) {
        navigate('/suspended');
      } else {
        setError(err.response?.data?.detail || 'Invalid credentials');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center font-sans tracking-wide">
      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-[0_0_40px_-15px_rgba(245,158,11,0.1)] transition-colors duration-200">
        <div className="text-center mb-8">
          <div className="bg-amber-100 dark:bg-amber-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Gavel className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Authority Access</h2>
          <p className="text-slate-500 font-medium text-sm mt-2 uppercase tracking-widest">Verify credentials to proceed</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 text-xs font-bold uppercase tracking-widest p-4 rounded-lg mb-6 text-center shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 text-slate-900 dark:text-white font-medium transition-colors outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Secure Passcode</label>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-500 cursor-pointer hover:underline uppercase tracking-wide">Reset</span>
            </div>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 text-slate-900 dark:text-white font-mono tracking-widest transition-colors outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black uppercase tracking-widest py-4 px-4 mt-2 rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-xl shadow-amber-500/10"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Initiate Login <ArrowRight className="w-4 h-4 ml-1" /></>}
          </button>
        </form>
        
        <div className="mx-auto mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Unregistered Identity?{' '}
            <Link to="/register" className="text-slate-900 dark:text-white font-black hover:text-amber-500 dark:hover:text-amber-500 transition-colors inline-block ml-1">
              Initialize Profile
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

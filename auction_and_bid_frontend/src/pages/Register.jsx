import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Loader2, ArrowRight } from 'lucide-react';
import { formatApiError } from '../utils/apiError';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: ''
  });
  const [error, setError] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const next = { ...formData, [e.target.name]: e.target.value };
    setFormData(next);
    if (e.target.name === 'password') {
      const p = e.target.value || '';
      let score = 0;
      if (p.length >= 8) score++;
      if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
      if (/\d/.test(p)) score++;
      if (/[^A-Za-z0-9]/.test(p)) score++;
      setPasswordStrength(score);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }
    if (formData.password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    try {
      await register(formData);
      navigate('/login', { state: { banner: 'Account created — please verify your email' } });
    } catch (err) {
      setError(formatApiError(err, 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center font-sans tracking-wide">
      <div className="bg-white dark:bg-slate-900 p-8 md:p-10 rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-[0_0_40px_-15px_rgba(245,158,11,0.1)] transition-colors duration-200">
        <div className="text-center mb-8">
          <div className="bg-amber-100 dark:bg-amber-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <UserPlus className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Prime Alliance</h2>
          <p className="text-slate-500 font-medium text-sm mt-2 uppercase tracking-widest">Register network identity</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 text-xs font-bold uppercase tracking-widest p-4 rounded-lg mb-6 text-center shadow-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Network ID</label>
              <input name="username" type="text" required onChange={handleChange} className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 text-slate-900 dark:text-white font-medium transition-colors outline-none" placeholder="Username" />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Full Legal Name</label>
              <input name="full_name" type="text" onChange={handleChange} className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 text-slate-900 dark:text-white font-medium transition-colors outline-none" placeholder="John Doe" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 mt-2">Verified Email</label>
            <input name="email" type="email" required onChange={handleChange} className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 text-slate-900 dark:text-white font-medium transition-colors outline-none" placeholder="john@example.com" />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 mt-2">Secure Passcode</label>
            <input name="password" type="password" required onChange={handleChange} className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 text-slate-900 dark:text-white font-mono tracking-widest transition-colors outline-none" placeholder="••••••••" />
            <div className="mt-2 h-2 rounded bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div className={`h-full transition-all duration-200 ${
                passwordStrength <= 1 ? 'bg-red-500' : passwordStrength <= 2 ? 'bg-amber-500' : 'bg-green-500'
              }`} style={{ width: `${(passwordStrength / 4) * 100}%` }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 mt-2">Confirm Passcode</label>
            <input value={confirmPassword} type="password" required onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-amber-500 text-slate-900 dark:text-white font-mono tracking-widest transition-colors outline-none" placeholder="••••••••" />
          </div>
          
          <button type="submit" disabled={isLoading} className="w-full bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-black uppercase tracking-widest py-4 px-4 mt-8 rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-xl">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> : <>Construct Identity <ArrowRight className="w-4 h-4 ml-1" /></>}
          </button>
        </form>
        
        <div className="mx-auto mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Identity Existing?{' '}
            <Link to="/login" className="text-slate-900 dark:text-white font-black hover:text-amber-500 dark:hover:text-amber-500 transition-colors inline-block ml-1">
              Access Terminal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

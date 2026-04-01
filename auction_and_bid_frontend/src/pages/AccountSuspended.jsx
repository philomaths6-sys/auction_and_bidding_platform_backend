import React from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AccountSuspended() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSupportClick = () => {
    window.location.href = "mailto:support@primeauctions.com?subject=Account%20Suspension%20Appeal";
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans">
      <div className="max-w-md w-full p-10 text-center">
        <div className="w-24 h-24 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse border-2 border-red-500/50 shadow-[0_0_50px_-10px_rgba(239,68,68,0.4)]">
          <ShieldAlert className="w-12 h-12 text-red-500" />
        </div>
        
        <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">
          Your account has been <br/><span className="text-red-500">suspended</span>
        </h1>
        
        <p className="text-slate-400 font-medium leading-relaxed mb-10">
          If you believe this is an error, please contact our support team.
        </p>

        <div className="space-y-4">
          <button 
            onClick={handleSupportClick}
            className="w-full bg-slate-900 border border-slate-800 hover:border-red-500/50 text-white font-black uppercase tracking-widest py-4 px-6 rounded-lg transition-all"
          >
            Appeal to Support
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white font-bold uppercase tracking-widest py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Disconnect Session
          </button>
        </div>
        
        <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-12">
          Error Code: 403 Forbidden
        </p>
      </div>
    </div>
  );
}

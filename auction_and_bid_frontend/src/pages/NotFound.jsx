import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center font-sans px-4">
      <div className="text-center max-w-2xl">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            404
          </h1>
          <div className="w-32 h-1 bg-amber-500 mx-auto mt-4"></div>
        </div>

        {/* Error Message */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4">
            Page Not Found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            to="/" 
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black uppercase tracking-widest px-8 py-4 rounded-xl transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-amber-500/20"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>
          
          <Link 
            to="/auctions" 
            className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase tracking-widest px-8 py-4 rounded-xl transition-transform hover:scale-105 active:scale-95 shadow-lg"
          >
            <Search className="w-5 h-5" />
            Browse Auctions
          </Link>
        </div>

        {/* Additional Info */}
        <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            If you believe this is an error, please contact our support team.
          </p>
          <div className="mt-4 flex justify-center gap-6">
            <Link 
              to="/login" 
              className="text-amber-500 dark:text-amber-400 hover:text-amber-400 dark:hover:text-amber-300 font-medium text-sm transition-colors"
            >
              Login
            </Link>
            <Link 
              to="/register" 
              className="text-amber-500 dark:text-amber-400 hover:text-amber-400 dark:hover:text-amber-300 font-medium text-sm transition-colors"
            >
              Register
            </Link>
            <Link 
              to="/dashboard" 
              className="text-amber-500 dark:text-amber-400 hover:text-amber-400 dark:hover:text-amber-300 font-medium text-sm transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-amber-500/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
}

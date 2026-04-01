import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now().toString();
    setToasts(prev => {
      const newToasts = [...prev, { id, message, type }];
      return newToasts.slice(-3); // max 3 visible stack per instructions
    });

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl border max-w-md w-full animate-in slide-in-from-bottom-5 fade-in duration-300 ${
            t.type === 'success' ? 'bg-white dark:bg-slate-900 border-green-500/20 dark:border-green-500/30' :
            t.type === 'error' ? 'bg-white dark:bg-slate-900 border-red-500/20 dark:border-red-500/30' :
            t.type === 'warning' ? 'bg-white dark:bg-slate-900 border-amber-500/20 dark:border-amber-500/30' :
            'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}>
            <div className={`flex-shrink-0 mt-0.5 ${
              t.type === 'success' ? 'text-green-500' :
              t.type === 'error' ? 'text-red-500' :
              t.type === 'warning' ? 'text-amber-500' :
              'text-blue-500'
            }`}>
              {t.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {t.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {t.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            
            <div className="flex-grow font-sans text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 leading-snug">
              {t.message}
            </div>
            
            <button 
              onClick={() => removeToast(t.id)} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors flex-shrink-0 -mt-1 -mr-1 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

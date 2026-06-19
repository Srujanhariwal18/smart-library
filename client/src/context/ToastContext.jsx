import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* Toast Render Area */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => {
          let Icon = Info;
          let bgColor = 'bg-blue-500';
          if (toast.type === 'success') {
            Icon = CheckCircle;
            bgColor = 'bg-emerald-500';
          } else if (toast.type === 'error') {
            Icon = AlertCircle;
            bgColor = 'bg-rose-500';
          } else if (toast.type === 'warning') {
            Icon = AlertTriangle;
            bgColor = 'bg-amber-500';
          }

          return (
            <div
              key={toast.id}
              className={`flex items-center justify-between p-4 text-white rounded-lg shadow-lg border border-white/10 ${bgColor} animate-toast`}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} className="shrink-0" />
                <span className="text-sm font-medium">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-white/80 hover:text-white transition-colors ml-4 shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

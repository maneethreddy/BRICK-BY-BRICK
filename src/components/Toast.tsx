import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ message, type, onClose, duration = 3000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400" />,
    info: <CheckCircle2 className="w-5 h-5 text-emerald-400" />
  };

  const borderColors = {
    success: 'border-emerald-500/30 shadow-emerald-950/20',
    error: 'border-rose-500/30 shadow-rose-950/20',
    info: 'border-emerald-500/30 shadow-emerald-950/20'
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border glass-panel shadow-lg ${borderColors[type]} min-w-[280px] transition-all duration-300`}>
        {icons[type]}
        <div className="flex-1 text-sm font-medium text-gray-200">
          {message}
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

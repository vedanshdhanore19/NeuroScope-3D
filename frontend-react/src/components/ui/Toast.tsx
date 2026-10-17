import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id?: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss, durationMs = 5000 }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [toast, onDismiss, durationMs]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div
      role="alert"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white transition-all transform animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-lg ${
        isSuccess
          ? 'bg-emerald-800/95 border border-emerald-600/40 text-emerald-50'
          : isError
          ? 'bg-rose-900/95 border border-rose-700/40 text-rose-50'
          : 'bg-sky-900/95 border border-sky-700/40 text-sky-50'
      }`}
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div className="shrink-0">
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
        ) : isError ? (
          <AlertCircle className="w-5 h-5 text-rose-300" />
        ) : (
          <Info className="w-5 h-5 text-sky-300" />
        )}
      </div>

      <span className="text-sm font-medium leading-snug flex-1">{toast.message}</span>

      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
export default Toast;

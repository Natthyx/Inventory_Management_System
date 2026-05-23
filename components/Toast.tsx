'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastPayload {
  message: string;
  variant: ToastVariant;
}

interface ActiveToast extends ToastPayload {
  id: number;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const variantStyles: Record<ToastVariant, string> = {
  success: 'border border-emerald-200 bg-emerald-50 text-emerald-900 shadow-lg shadow-emerald-100/40',
  error: 'border border-red-200 bg-red-50 text-red-900 shadow-lg shadow-red-100/40',
  info: 'border border-blue-200 bg-blue-50 text-blue-900 shadow-lg shadow-blue-100/40',
};

export function ToastProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const timers = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((previous) => previous.filter((toastItem) => toastItem.id !== id));
    const pending = timers.current.get(id);
    if (pending) {
      clearTimeout(pending);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 100);
    setToasts((previous) => [...previous, { id, message, variant }]);

    const timeout = setTimeout(() => {
      removeToast(id);
    }, 3000);

    timers.current.set(id, timeout);
  }, [removeToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <aside
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-20 z-[150] flex max-w-sm flex-col gap-3 sm:right-6 sm:top-24"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto transform rounded-xl px-5 py-4 text-sm font-medium shadow-md animate-slideInRight ${variantStyles[toast.variant]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="flex-1 leading-relaxed">{toast.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                className="rounded-md border border-transparent p-1 text-xs font-semibold text-gray-500 transition hover:bg-white/40"
                onClick={() => removeToast(toast.id)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </aside>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider');
  }

  return context.showToast;
}

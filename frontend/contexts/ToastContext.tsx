'use client';

import { createContext, useContext, ReactNode } from 'react';
import { ToastContainer, useToasts, Toast } from '@/components/ui/Toast';

interface ToastContextType {
  success: (message: string, options?: Partial<Omit<Toast, 'type' | 'message'>>) => string;
  error: (message: string, options?: Partial<Omit<Toast, 'type' | 'message'>>) => string;
  warning: (message: string, options?: Partial<Omit<Toast, 'type' | 'message'>>) => string;
  info: (message: string, options?: Partial<Omit<Toast, 'type' | 'message'>>) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts, success, error, warning, info, dismissToast } = useToasts();

  return (
    <ToastContext.Provider value={{ success, error, warning, info, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} position="top-right" />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
}

interface AppToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const AppToast: React.FC<AppToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start space-x-3 px-4 py-3 rounded-xl shadow-2xl border bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-700 dark:border-neutral-200 animate-in slide-in-from-bottom-3 duration-200"
          >
            {isError ? (
              <AlertCircle className="h-4 w-4 text-rose-400 dark:text-rose-600 shrink-0 mt-0.5" />
            ) : isSuccess ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 dark:text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Info className="h-4 w-4 text-blue-400 dark:text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs leading-relaxed font-medium">
              {toast.message}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-neutral-400 hover:text-white dark:hover:text-neutral-900 p-0.5 rounded transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

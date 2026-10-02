'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
  Clock,
  Calendar,
} from 'lucide-react';
import { ToastMessage } from '@/types';
import { formatTimeRange } from '@/lib/dateUtils';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto rounded-xl p-4 shadow-lg border backdrop-blur-md transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-100'
                : toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-950 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-100'
                : toast.type === 'warning'
                ? 'bg-amber-50/95 border-amber-200 text-amber-950 dark:bg-amber-950/90 dark:border-amber-800 dark:text-amber-100'
                : 'bg-sky-50/95 border-sky-200 text-sky-950 dark:bg-sky-950/90 dark:border-sky-800 dark:text-sky-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {toast.type === 'success' && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                )}
                {toast.type === 'error' && (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                )}
                {toast.type === 'warning' && (
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                )}
                {toast.type === 'info' && (
                  <Info className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold leading-tight">{toast.title}</h4>
                <p className="text-xs mt-1 opacity-90 leading-relaxed break-words">
                  {toast.message}
                </p>

                {toast.conflictingBooking && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-rose-100/80 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800/60 text-xs">
                    <span className="font-semibold text-rose-900 dark:text-rose-200 block mb-1">
                      Conflicting Existing Booking:
                    </span>
                    <div className="text-rose-800 dark:text-rose-300 font-medium">
                      &ldquo;{toast.conflictingBooking.title}&rdquo;
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-rose-700 dark:text-rose-400 text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {toast.conflictingBooking.booking_date}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeRange(
                          toast.conflictingBooking.start_time,
                          toast.conflictingBooking.end_time
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

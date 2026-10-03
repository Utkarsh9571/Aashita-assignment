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
  Building2,
} from 'lucide-react';
import { ToastMessage } from '@/types';
import { formatTimeRange } from '@/lib/dateUtils';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <aside
      className="fixed top-4 sm:top-5 inset-x-3 sm:inset-x-auto sm:right-5 sm:w-full sm:max-w-md z-50 flex flex-col gap-2.5 pointer-events-none"
      aria-live="polite"
      aria-label="System notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const isConflict = Boolean(toast.conflictingBooking);
          const role = toast.type === 'error' ? 'alert' : 'status';

          return (
            <motion.div
              key={toast.id}
              role={role}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className={`pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all ${
                toast.type === 'success'
                  ? 'bg-emerald-50/95 border-emerald-300 text-emerald-950'
                  : toast.type === 'error'
                  ? 'bg-rose-50/95 border-rose-300 text-rose-950'
                  : toast.type === 'warning'
                  ? 'bg-amber-50/95 border-amber-300 text-amber-950'
                  : 'bg-[#E6FAF8]/95 border-[#00C9B7]/40 text-[#003B45]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  {toast.type === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  )}
                  {toast.type === 'error' && (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                  {toast.type === 'warning' && (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                  {toast.type === 'info' && (
                    <Info className="w-5 h-5 text-[#00C9B7]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-bold leading-tight">
                      {toast.title}
                    </h4>
                    {isConflict && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                        409 Conflict
                      </span>
                    )}
                  </div>

                  {/* Actual Backend Message */}
                  <p className="text-xs mt-1 opacity-90 leading-relaxed break-words font-medium">
                    {toast.message}
                  </p>

                  {/* Conflicting Booking Card for 409 errors */}
                  {toast.conflictingBooking && (
                    <div className="mt-2.5 p-3 rounded-xl bg-rose-100/90 border border-rose-300 text-xs shadow-2xs">
                      <span className="font-bold text-rose-950 block mb-1">
                        Conflicting Existing Booking:
                      </span>
                      <div className="text-rose-950 font-bold truncate">
                        &ldquo;{toast.conflictingBooking.title}&rdquo;
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-rose-800 text-[11px]">
                        {(toast.conflictingBooking.room_name || toast.conflictingBooking.room?.name) && (
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Building2 className="w-3 h-3 text-rose-600" />
                            {toast.conflictingBooking.room_name || toast.conflictingBooking.room?.name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-rose-600" />
                          {toast.conflictingBooking.date || toast.conflictingBooking.booking_date}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold">
                          <Clock className="w-3 h-3 text-rose-600" />
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
                  className="shrink-0 rounded-full p-1 opacity-60 hover:opacity-100 transition-opacity focus:outline-none"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </aside>
  );
};

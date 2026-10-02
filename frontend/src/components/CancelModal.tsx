'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, Calendar, Building2, Loader2, X } from 'lucide-react';
import { Booking } from '@/types';
import { formatTimeRange } from '@/lib/dateUtils';

interface CancelModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (bookingId: number) => Promise<boolean>;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  booking,
  isOpen,
  onClose,
  onConfirmCancel,
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!isOpen || !booking) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    const success = await onConfirmCancel(booking.id);
    setIsDeleting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10"
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3">
              <h3 className="text-base font-bold text-slate-900">
                Cancel Meeting Booking
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to cancel this booking? This will immediately free up the timeslot for others.
              </p>

              {/* Booking details card */}
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                <div className="font-semibold text-slate-900 text-sm">
                  &ldquo;{booking.title}&rdquo;
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{booking.room?.name || `Room #${booking.room_id}`}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {booking.booking_date}
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    {formatTimeRange(booking.start_time, booking.end_time)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition disabled:opacity-50 shadow-sm shadow-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Yes, Cancel Booking</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

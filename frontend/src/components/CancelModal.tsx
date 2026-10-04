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
          className="fixed inset-0 bg-[#003B45]/65 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10"
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4">
              <h3 className="text-base sm:text-lg font-extrabold text-[#10243A]">
                Cancel Meeting Booking
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-normal">
                Are you sure you want to cancel this booking? This will immediately free up the timeslot for other team members.
              </p>

              {/* Booking details card */}
              <div className="mt-4 p-4 rounded-2xl bg-[#F8FCFC] border border-slate-200/90 text-xs space-y-2.5">
                <div className="font-extrabold text-[#10243A] text-sm truncate">
                  &ldquo;{booking.title}&rdquo;
                </div>
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-[#00C9B7]" />
                  <span>{booking.room?.name || `Room #${booking.room_id}`}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-600">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-[#00C9B7]" />
                    {booking.booking_date || booking.date}
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-[#003B45]">
                    <Clock className="w-3.5 h-3.5 text-[#00C9B7]" />
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
                className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isDeleting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition disabled:opacity-50 shadow-sm shadow-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
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

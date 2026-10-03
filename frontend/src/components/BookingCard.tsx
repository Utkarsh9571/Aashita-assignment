'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, MapPin, Trash2, Users } from 'lucide-react';
import { Booking } from '@/types';
import {
  formatTimeRange,
  calculateDurationMinutes,
} from '@/lib/dateUtils';

interface BookingCardProps {
  booking: Booking;
  onCancelClick: (booking: Booking) => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onCancelClick,
}) => {
  const duration = calculateDurationMinutes(booking.start_time, booking.end_time);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className="group bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 hover:border-[#00C9B7]/50 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative overflow-hidden"
    >
      {/* Subtle left accent highlight on hover */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#00C9B7] to-[#003B45] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E6FAF8] text-[#003B45] border border-[#00C9B7]/30">
            {booking.room?.name || `Room #${booking.room_id}`}
          </span>
          {booking.room && (
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              {booking.room.capacity} seats
            </span>
          )}
        </div>

        <h3 className="text-base font-extrabold text-[#10243A] truncate">
          {booking.title}
        </h3>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-bold text-[#003B45]">
            <Clock className="w-3.5 h-3.5 text-[#00C9B7]" />
            <span>{formatTimeRange(booking.start_time, booking.end_time)}</span>
            <span className="text-slate-400 font-normal">({duration} min)</span>
          </div>

          {booking.room?.location && (
            <div className="flex items-center gap-1 text-slate-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{booking.room.location}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        <button
          type="button"
          onClick={() => onCancelClick(booking)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          aria-label={`Cancel booking: ${booking.title}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>
      </div>
    </motion.div>
  );
};

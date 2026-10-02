'use client';

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { CalendarX, Plus, Sparkles, Building2 } from 'lucide-react';
import { Room, Booking } from '@/types';
import { BookingCard } from './BookingCard';
import { timeStringToMinutes, WORKING_HOURS } from '@/lib/dateUtils';

interface ScheduleTimelineProps {
  rooms: Room[];
  bookings: Booking[];
  selectedRoomId: number | null;
  isLoading: boolean;
  selectedDate: string;
  onOpenBookingModal: (prefillRoomId?: number) => void;
  onCancelClick: (booking: Booking) => void;
}

export const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({
  rooms,
  bookings,
  selectedRoomId,
  isLoading,
  selectedDate,
  onOpenBookingModal,
  onCancelClick,
}) => {
  // If a room is filtered, show only that room's section; else show all rooms
  const displayedRooms = selectedRoomId
    ? rooms.filter((r) => r.id === selectedRoomId)
    : rooms;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse"
          >
            <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
            <div className="h-6 bg-slate-100 rounded w-1/2 mb-2" />
            <div className="h-4 bg-slate-100 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  // If no rooms exist at all
  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">
          No meeting rooms found
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Ensure the database is seeded with rooms and the backend is running.
        </p>
      </div>
    );
  }

  // If there are zero bookings across all displayed rooms
  const totalFilteredBookings = bookings.length;

  return (
    <div className="space-y-6">
      {displayedRooms.map((room) => {
        const roomBookings = bookings.filter((b) => b.room_id === room.id);

        // Calculate workday progress percentage
        // Total working minutes = 18:00 - 09:00 = 540 min
        const totalWorkMinutes = WORKING_HOURS.END_MINUTES - WORKING_HOURS.START_MINUTES;
        const bookedMinutes = roomBookings.reduce((acc, b) => {
          const s = Math.max(timeStringToMinutes(b.start_time), WORKING_HOURS.START_MINUTES);
          const e = Math.min(timeStringToMinutes(b.end_time), WORKING_HOURS.END_MINUTES);
          return acc + Math.max(0, e - s);
        }, 0);
        const bookedPercent = Math.min(100, Math.round((bookedMinutes / totalWorkMinutes) * 100));

        return (
          <div
            key={room.id}
            className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs"
          >
            {/* Room Header with Timeline Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {room.name}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    ({room.capacity} seats)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{room.location}</p>
              </div>

              {/* Day Occupancy Bar */}
              <div className="flex items-center gap-3 sm:w-64">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
                    <span>{bookedPercent}% Booked</span>
                    <span>{540 - bookedMinutes}m free</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        bookedPercent >= 85
                          ? 'bg-rose-500'
                          : bookedPercent >= 50
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${bookedPercent}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenBookingModal(room.id)}
                  className="shrink-0 p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                  title={`Book in ${room.name}`}
                  aria-label={`Book in ${room.name}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Room Bookings or Empty State */}
            <div className="p-4 sm:p-5">
              {roomBookings.length === 0 ? (
                <div className="py-6 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/30 text-center">
                  <Sparkles className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    No bookings for {room.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Entire day (09:00 – 18:00) is open.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenBookingModal(room.id)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50/50 border border-slate-200 px-3 py-1.5 rounded-lg transition shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Book this room</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {roomBookings.map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        onCancelClick={onCancelClick}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Global empty state if all rooms empty */}
      {totalFilteredBookings === 0 && (
        <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-center text-xs text-slate-600">
          <CalendarX className="w-4 h-4 text-slate-400 inline mr-1.5 -mt-0.5" />
          No bookings scheduled across any selected room for {selectedDate}.
        </div>
      )}
    </div>
  );
};

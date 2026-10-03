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
            className="bg-white rounded-2xl border border-slate-200/80 p-6 animate-pulse"
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
      <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-[#E6FAF8] text-[#003B45] flex items-center justify-center mx-auto mb-3">
          <Building2 className="w-6 h-6 text-[#00C9B7]" />
        </div>
        <h3 className="text-base font-bold text-[#10243A]">
          No meeting rooms found
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Ensure the system is initialized with meeting rooms and the backend service is running.
        </p>
      </div>
    );
  }

  // Ensure ScheduleTimeline strictly receives and processes bookings for the selected date
  const dateBookings = bookings.filter((b) => {
    const bDate = b.date || b.booking_date;
    return !bDate || bDate === selectedDate;
  });

  const totalFilteredBookings = dateBookings.length;

  return (
    <div className="space-y-6">
      {displayedRooms.map((room) => {
        const roomBookings = dateBookings.filter((b) => b.room_id === room.id);

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
            className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs transition-all hover:shadow-xs"
          >
            {/* Room Header with Timeline Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-[#F8FCFC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-[#10243A]">
                    {room.name}
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                    {room.capacity} seats
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{room.location}</p>
              </div>

              {/* Day Occupancy Bar */}
              <div className="flex items-center gap-3 sm:w-64">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                    <span className="text-[#003B45]">{bookedPercent}% Booked</span>
                    <span className="text-slate-400 font-medium">{540 - bookedMinutes}m free</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        bookedPercent >= 85
                          ? 'bg-rose-500'
                          : bookedPercent >= 50
                          ? 'bg-amber-500'
                          : 'bg-[#00C9B7]'
                      }`}
                      style={{ width: `${bookedPercent}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenBookingModal(room.id)}
                  className="shrink-0 p-2 text-[#003B45] hover:text-[#00C9B7] hover:bg-[#E6FAF8] rounded-full transition"
                  title={`Book in ${room.name}`}
                  aria-label={`Book in ${room.name}`}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Room Bookings or Empty State */}
            <div className="p-4 sm:p-5">
              {roomBookings.length === 0 ? (
                <div className="py-8 px-4 rounded-2xl border border-dashed border-[#00C9B7]/40 bg-[#F0F7F7]/40 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#E6FAF8] text-[#00C9B7] flex items-center justify-center mx-auto mb-2">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-[#10243A]">
                    No bookings scheduled for {room.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Entire business day (09:00 – 18:00) is currently open.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenBookingModal(room.id)}
                    className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-[#003B45] hover:text-white bg-white hover:bg-[#003B45] border border-slate-200 hover:border-[#003B45] px-4 py-2 rounded-full transition shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
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
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 text-center text-xs text-slate-600 shadow-2xs">
          <CalendarX className="w-4 h-4 text-[#00C9B7] inline mr-1.5 -mt-0.5" />
          No bookings scheduled across any selected room for {selectedDate}.
        </div>
      )}
    </div>
  );
};

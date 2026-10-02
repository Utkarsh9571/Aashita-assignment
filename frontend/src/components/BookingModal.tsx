'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Building2, Tag, Loader2, AlertCircle } from 'lucide-react';
import { Room, BookingCreatePayload } from '@/types';
import { WORKING_HOURS, timeStringToMinutes } from '@/lib/dateUtils';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  selectedDate: string;
  prefillRoomId?: number | null;
  prefillTimes?: { start: string; end: string } | null;
  onSubmit: (payload: BookingCreatePayload) => Promise<boolean>;
}

interface FormErrors {
  room_id?: string;
  title?: string;
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  general?: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  rooms,
  selectedDate,
  prefillRoomId,
  prefillTimes,
  onSubmit,
}) => {
  const [roomId, setRoomId] = useState<number | ''>(
    prefillRoomId || (rooms.length > 0 ? rooms[0].id : '')
  );
  const [title, setTitle] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>(selectedDate);
  const [startTime, setStartTime] = useState<string>(prefillTimes?.start || '09:00');
  const [endTime, setEndTime] = useState<string>(prefillTimes?.end || '10:00');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // 1. Room required
    if (!roomId) {
      newErrors.room_id = 'Please select a meeting room.';
    }

    // 2. Title required
    if (!title.trim()) {
      newErrors.title = 'Meeting title is required.';
    } else if (title.trim().length < 2) {
      newErrors.title = 'Meeting title must be at least 2 characters long.';
    }

    // 3. Valid date
    if (!bookingDate) {
      newErrors.booking_date = 'Please select a valid date.';
    }

    // 4. Start & End times required
    if (!startTime) {
      newErrors.start_time = 'Start time is required.';
    }
    if (!endTime) {
      newErrors.end_time = 'End time is required.';
    }

    if (startTime && endTime) {
      const startMin = timeStringToMinutes(startTime);
      const endMin = timeStringToMinutes(endTime);

      // 5. Working hours 09:00–18:00
      if (startMin < WORKING_HOURS.START_MINUTES) {
        newErrors.start_time = 'Start time cannot be earlier than 09:00 AM.';
      }
      if (startMin >= WORKING_HOURS.END_MINUTES) {
        newErrors.start_time = 'Start time must be before 06:00 PM.';
      }

      if (endMin <= WORKING_HOURS.START_MINUTES) {
        newErrors.end_time = 'End time must be after 09:00 AM.';
      }
      if (endMin > WORKING_HOURS.END_MINUTES) {
        newErrors.end_time = 'End time cannot be later than 06:00 PM.';
      }

      // 6. start < end
      if (startMin >= endMin) {
        newErrors.end_time = 'End time must be strictly after start time.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const success = await onSubmit({
      room_id: Number(roomId),
      title: title.trim(),
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
    });
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  if (!isOpen) return null;

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
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Create Room Booking
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Working hours: 09:00 AM – 06:00 PM
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Room Selector */}
            <div>
              <label
                htmlFor="booking-room"
                className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Room</span>
              </label>
              <select
                id="booking-room"
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value ? Number(e.target.value) : '');
                  if (errors.room_id) setErrors((prev) => ({ ...prev, room_id: undefined }));
                }}
                className={`w-full text-xs sm:text-sm font-medium rounded-xl border px-3 py-2.5 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 ${
                  errors.room_id
                    ? 'border-rose-300 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              >
                <option value="">Select a meeting room</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.capacity} seats ({r.location})
                  </option>
                ))}
              </select>
              {errors.room_id && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.room_id}
                </p>
              )}
            </div>

            {/* Meeting Title */}
            <div>
              <label
                htmlFor="booking-title"
                className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
              >
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Meeting Title</span>
              </label>
              <input
                id="booking-title"
                type="text"
                placeholder="e.g., Sprint Planning & Retrospective"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                className={`w-full text-xs sm:text-sm font-medium rounded-xl border px-3 py-2.5 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  errors.title
                    ? 'border-rose-300 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
              {errors.title && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Booking Date */}
            <div>
              <label
                htmlFor="booking-date"
                className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date</span>
              </label>
              <input
                id="booking-date"
                type="date"
                value={bookingDate}
                onChange={(e) => {
                  setBookingDate(e.target.value);
                  if (errors.booking_date)
                    setErrors((prev) => ({ ...prev, booking_date: undefined }));
                }}
                className={`w-full text-xs sm:text-sm font-medium rounded-xl border px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 ${
                  errors.booking_date
                    ? 'border-rose-300 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
              {errors.booking_date && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.booking_date}
                </p>
              )}
            </div>

            {/* Start and End Times */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="booking-start"
                  className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Start Time</span>
                </label>
                <input
                  id="booking-start"
                  type="time"
                  step="900"
                  min="09:00"
                  max="18:00"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    if (errors.start_time || errors.end_time) {
                      setErrors((prev) => ({
                        ...prev,
                        start_time: undefined,
                        end_time: undefined,
                      }));
                    }
                  }}
                  className={`w-full text-xs sm:text-sm font-medium rounded-xl border px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 ${
                    errors.start_time
                      ? 'border-rose-300 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                  }`}
                />
                {errors.start_time && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.start_time}</span>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="booking-end"
                  className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>End Time</span>
                </label>
                <input
                  id="booking-end"
                  type="time"
                  step="900"
                  min="09:00"
                  max="18:00"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    if (errors.end_time) {
                      setErrors((prev) => ({ ...prev, end_time: undefined }));
                    }
                  }}
                  className={`w-full text-xs sm:text-sm font-medium rounded-xl border px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 ${
                    errors.end_time
                      ? 'border-rose-300 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500'
                  }`}
                />
                {errors.end_time && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errors.end_time}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Quick Timeslots Info */}
            <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2.5 border border-slate-200/70">
              Slots must strictly fit within 09:00 AM – 06:00 PM. Consecutive back-to-back bookings (e.g. 10:00–11:00 and 11:00–12:00) are fully supported.
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition disabled:opacity-50 shadow-sm shadow-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking conflicts...</span>
                  </>
                ) : (
                  <span>Confirm Booking</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

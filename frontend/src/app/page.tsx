'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { RoomFilter } from '@/components/RoomFilter';
import { ScheduleTimeline } from '@/components/ScheduleTimeline';
import { NextAvailableWidget } from '@/components/NextAvailableWidget';
import { BookingModal } from '@/components/BookingModal';
import { CancelModal } from '@/components/CancelModal';
import { ToastContainer } from '@/components/Toast';
import { Room, Booking, BookingCreatePayload, ToastMessage } from '@/types';
import { fetchRooms, fetchBookings, createBooking, cancelBooking, ApiError } from '@/lib/api';
import { getTodayDateString, formatHumanDate, formatTimeRange } from '@/lib/dateUtils';
import { AlertCircle, RefreshCw, Calendar, CheckCircle } from 'lucide-react';

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(true);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Modal states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [modalPrefillRoomId, setModalPrefillRoomId] = useState<number | null>(null);
  const [modalPrefillTimes, setModalPrefillTimes] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastMessage = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);

      // Conflicts stay a bit longer (8s) so user can read conflicting details; others 5s
      const timeoutMs = toast.conflictingBooking ? 8000 : 5000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, timeoutMs);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch Rooms
  const refreshRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const data = await fetchRooms();
      setRooms(data);
      setNetworkError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to load meeting rooms.';
      setNetworkError(msg);
      addToast({
        type: 'error',
        title: 'Server Connection Error',
        message: msg,
      });
    } finally {
      setIsLoadingRooms(false);
    }
  }, [addToast]);

  // Fetch Bookings for current selected date & room filter
  const refreshBookings = useCallback(async () => {
    setIsLoadingBookings(true);
    try {
      const data = await fetchBookings({
        date: selectedDate,
        room_id: selectedRoomId !== null ? selectedRoomId : undefined,
      });
      setBookings(data);
      setNetworkError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve bookings.';
      setNetworkError(msg);
      addToast({
        type: 'error',
        title: 'Error Loading Schedule',
        message: msg,
      });
    } finally {
      setIsLoadingBookings(false);
    }
  }, [selectedDate, selectedRoomId, addToast]);

  // Initial load of rooms
  useEffect(() => {
    let isMounted = true;
    fetchRooms()
      .then((data) => {
        if (isMounted) {
          setRooms(data);
          setNetworkError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Unable to load rooms.';
          setNetworkError(msg);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingRooms(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Load bookings whenever date or room filter changes
  useEffect(() => {
    let isMounted = true;
    fetchBookings({
      date: selectedDate,
      room_id: selectedRoomId !== null ? selectedRoomId : undefined,
    })
      .then((data) => {
        if (isMounted) {
          setBookings(data);
          setNetworkError(null);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to retrieve bookings.';
          setNetworkError(msg);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingBookings(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedRoomId]);

  // Open create modal with optional room/times pre-fill
  const handleOpenBookingModal = (
    prefillRoomId?: number | null,
    prefillTimes?: { start: string; end: string } | null
  ) => {
    setModalPrefillRoomId(prefillRoomId !== undefined ? prefillRoomId : selectedRoomId);
    setModalPrefillTimes(prefillTimes || null);
    setIsBookingModalOpen(true);
  };

  // Submit booking creation
  const handleCreateBooking = async (
    payload: BookingCreatePayload
  ): Promise<boolean> => {
    try {
      const created = await createBooking(payload);
      const roomName =
        rooms.find((r) => r.id === created.room_id)?.name ||
        created.room_name ||
        `Room #${created.room_id}`;

      const toastMessage =
        created.message ||
        `"${created.title}" successfully booked for ${
          created.date || created.booking_date
        } (${formatTimeRange(created.start_time, created.end_time)}) in ${roomName}.`;

      addToast({
        type: 'success',
        title: 'Booking Confirmed',
        message: toastMessage,
      });

      // Immediate refresh of bookings for the active date/filter
      await refreshBookings();
      return true;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          // Booking Conflict - display actual backend conflict message & conflicting booking
          addToast({
            type: 'error',
            title: 'Booking Conflict',
            message: err.message,
            conflictingBooking: err.conflictingBooking,
          });
        } else if (err.status === 404) {
          addToast({
            type: 'error',
            title: 'Room Not Found',
            message: err.message,
          });
        } else if (err.status === 400 || err.status === 422) {
          addToast({
            type: 'error',
            title: 'Validation Error',
            message: err.message,
          });
        } else if (err.status === 0) {
          addToast({
            type: 'error',
            title: 'Network Connection Error',
            message: err.message,
          });
        } else {
          addToast({
            type: 'error',
            title: `Server Error (${err.status})`,
            message: err.message,
          });
        }
      } else {
        addToast({
          type: 'error',
          title: 'Unexpected Error',
          message: err instanceof Error ? err.message : 'Failed to create booking.',
        });
      }
      return false;
    }
  };

  // Open Cancel Confirmation Dialog
  const handleOpenCancelModal = (booking: Booking) => {
    setCancelModalBooking(booking);
    setIsCancelModalOpen(true);
  };

  // Execute cancellation
  const handleConfirmCancel = async (bookingId: number): Promise<boolean> => {
    try {
      const res = await cancelBooking(bookingId);
      addToast({
        type: 'info',
        title: 'Booking Cancelled',
        message: res.message || 'The booking has been successfully removed.',
      });
      // Immediate refresh of bookings
      await refreshBookings();
      return true;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          addToast({
            type: 'error',
            title: 'Booking Not Found',
            message: err.message,
          });
        } else if (err.status === 0) {
          addToast({
            type: 'error',
            title: 'Network Connection Error',
            message: err.message,
          });
        } else {
          addToast({
            type: 'error',
            title: `Cancellation Error (${err.status})`,
            message: err.message,
          });
        }
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to cancel booking.';
        addToast({
          type: 'error',
          title: 'Cancellation Failed',
          message: msg,
        });
      }
      return false;
    }
  };

  // When next available slot is chosen from the widget
  const handleSelectSlot = (
    roomId: number,
    date: string,
    startTime: string,
    endTime: string
  ) => {
    setSelectedDate(date);
    setSelectedRoomId(roomId);
    handleOpenBookingModal(roomId, { start: startTime, end: endTime });
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 flex flex-col font-sans">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Top Header & Navigation */}
      <Header
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onOpenBookingModal={() => handleOpenBookingModal()}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Backend Connection Error Alert Banner */}
        {networkError && (
          <div className="rounded-2xl p-4 bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold">
                  Connecting to backend service
                </p>
                <p className="text-xs text-rose-700 mt-0.5">
                  The backend is connecting. If the service was idle, it may take a few seconds to wake up.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                refreshRooms();
                refreshBookings();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-rose-300 text-rose-800 hover:bg-rose-100/50 transition shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* Date Context and Quick Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Selected Schedule
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              {formatHumanDate(selectedDate)}
            </h2>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                <strong className="text-slate-900">{bookings.length}</strong> active{' '}
                {bookings.length === 1 ? 'booking' : 'bookings'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>
                <strong className="text-slate-900">{rooms.length}</strong> rooms ready
              </span>
            </div>
          </div>
        </div>

        {/* Room Filter Pills */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
          <RoomFilter
            rooms={rooms}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
            bookings={bookings}
          />
        </div>

        {/* Grid layout: Left = Schedule Timeline; Right = Next Available Slot Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Bookings & Timeline (2 Columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {selectedRoomId
                  ? `${rooms.find((r) => r.id === selectedRoomId)?.name || 'Room'} Bookings`
                  : 'All Room Schedules'}
              </h3>
              <button
                type="button"
                onClick={() => refreshBookings()}
                disabled={isLoadingBookings}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
                title="Refresh schedule"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoadingBookings ? 'animate-spin text-indigo-600' : ''}`}
                />
                <span>Refresh</span>
              </button>
            </div>

            <ScheduleTimeline
              rooms={rooms}
              bookings={bookings}
              selectedRoomId={selectedRoomId}
              isLoading={isLoadingBookings || isLoadingRooms}
              selectedDate={selectedDate}
              onOpenBookingModal={handleOpenBookingModal}
              onCancelClick={handleOpenCancelModal}
            />
          </div>

          {/* Right Column: Next Available Slot Finder & Info (1 Column) */}
          <div className="lg:col-span-1 space-y-6">
            <NextAvailableWidget
              rooms={rooms}
              selectedDate={selectedDate}
              defaultRoomId={selectedRoomId}
              onSelectSlot={handleSelectSlot}
              onToast={(type, title, message) =>
                addToast({
                  type,
                  title,
                  message,
                })
              }
            />

            {/* Quick Rules / Help Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 text-xs text-slate-600 space-y-3 shadow-2xs">
              <h4 className="font-bold text-slate-900 text-sm">
                Booking Guidelines
              </h4>
              <ul className="space-y-2 list-disc list-inside text-slate-600 leading-relaxed">
                <li>
                  <strong className="text-slate-800">Working hours:</strong> 09:00 AM – 06:00 PM only.
                </li>
                <li>
                  <strong className="text-slate-800">Back-to-back:</strong> Fully allowed (e.g. 10:00–11:00 followed immediately by 11:00–12:00).
                </li>
                <li>
                  <strong className="text-slate-800">Instant conflict check:</strong> Overlapping reservations are blocked both client-side and server-side.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Booking Creation Modal */}
      {isBookingModalOpen && (
        <BookingModal
          key={`${selectedDate}-${modalPrefillRoomId}-${modalPrefillTimes?.start || ''}`}
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          rooms={rooms}
          selectedDate={selectedDate}
          prefillRoomId={modalPrefillRoomId}
          prefillTimes={modalPrefillTimes}
          onSubmit={handleCreateBooking}
        />
      )}

      {/* Cancel Confirmation Modal */}
      <CancelModal
        isOpen={isCancelModalOpen}
        booking={cancelModalBooking}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancelModalBooking(null);
        }}
        onConfirmCancel={handleConfirmCancel}
      />
    </div>
  );
}

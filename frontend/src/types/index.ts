export interface Room {
  id: number;
  name: string;
  capacity: number;
  location: string;
  created_at?: string;
}

export interface Booking {
  id: number;
  room_id: number;
  room_name?: string;
  title: string;
  date?: string;
  booking_date?: string;
  start_time: string;
  end_time: string;
  created_at?: string;
  room?: Room;
}

export interface BookingCreatePayload {
  room_id: number;
  title: string;
  booking_date: string;
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
}

export interface NextAvailableResponse {
  room_id: number;
  room_name?: string;
  date: string;
  duration?: number;
  duration_minutes?: number;
  available?: boolean;
  slot_found?: boolean;
  start_time: string | null;
  end_time: string | null;
  message: string;
}

export interface ApiConflictDetail {
  message: string;
  conflicting_booking?: Booking;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  conflictingBooking?: Booking;
}

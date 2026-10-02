import {
  Room,
  Booking,
  BookingCreatePayload,
  NextAvailableResponse,
  ApiConflictDetail,
} from '@/types';

// In production, NEXT_PUBLIC_API_URL points to the deployed Render backend URL.
// In development, it defaults to http://localhost:8000.
const rawBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  conflictingBooking?: Booking;

  constructor(status: number, message: string, conflictingBooking?: Booking) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.conflictingBooking = conflictingBooking;
  }
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err: unknown) {
    const isNetwork =
      err instanceof TypeError || (err instanceof Error && err.name === 'TypeError');
    const msg = isNetwork
      ? 'Unable to connect to the backend server. Please verify your network connection and backend service availability.'
      : err instanceof Error
      ? err.message
      : 'Network communication failed.';
    throw new ApiError(0, msg);
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return (await res.json()) as T;
  }

  let errorMessage = `Request failed with status ${res.status}`;
  let conflictingBooking: Booking | undefined;

  try {
    const errorBody = await res.json();
    if (errorBody && errorBody.detail) {
      if (typeof errorBody.detail === 'string') {
        errorMessage = errorBody.detail;
      } else if (Array.isArray(errorBody.detail)) {
        errorMessage = errorBody.detail
          .map((item: { msg?: string; loc?: (string | number)[] }) => {
            const locKey = item.loc ? item.loc[item.loc.length - 1] : '';
            return locKey ? `${locKey}: ${item.msg}` : item.msg || '';
          })
          .filter(Boolean)
          .join('; ');
      } else if (typeof errorBody.detail === 'object') {
        const detail = errorBody.detail as ApiConflictDetail;
        if (detail.message) {
          errorMessage = detail.message;
        }
        if (detail.conflicting_booking) {
          conflictingBooking = detail.conflicting_booking;
        }
      }
    } else if (errorBody && errorBody.message) {
      errorMessage = errorBody.message;
    }

    if (errorBody && errorBody.conflicting_booking) {
      conflictingBooking = errorBody.conflicting_booking;
    }
  } catch {
    // If response was not JSON, retain status message
  }

  throw new ApiError(res.status, errorMessage, conflictingBooking);
}

export async function fetchRooms(): Promise<Room[]> {
  const res = await safeFetch(`${API_BASE_URL}/api/rooms`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  return handleResponse<Room[]>(res);
}

export async function fetchBookings(params: {
  date?: string;
  booking_date?: string;
  room_id?: number;
}): Promise<Booking[]> {
  const query = new URLSearchParams();
  const targetDate = params.date || params.booking_date;
  if (targetDate) {
    query.set('date', targetDate);
  }
  if (params.room_id !== undefined && params.room_id !== null) {
    query.set('room_id', String(params.room_id));
  }

  const res = await safeFetch(`${API_BASE_URL}/api/bookings?${query.toString()}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  return handleResponse<Booking[]>(res);
}

export async function createBooking(
  payload: BookingCreatePayload
): Promise<Booking> {
  const res = await safeFetch(`${API_BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Booking>(res);
}

export async function cancelBooking(
  bookingId: number
): Promise<{ message: string; booking_id: number }> {
  const res = await safeFetch(`${API_BASE_URL}/api/bookings/${bookingId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse<{ message: string; booking_id: number }>(res);
}

export async function fetchNextAvailableSlot(
  roomId: number,
  date: string,
  durationMinutes: number
): Promise<NextAvailableResponse> {
  const query = new URLSearchParams({
    date,
    duration: String(durationMinutes),
  });

  const res = await safeFetch(
    `${API_BASE_URL}/api/rooms/${roomId}/next-available?${query.toString()}`,
    {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    }
  );
  return handleResponse<NextAvailableResponse>(res);
}

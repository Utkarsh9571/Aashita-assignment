from datetime import date, time

from sqlalchemy.orm import Session

from app.models.booking import Booking
from app.models.room import Room
from app.schemas.booking import (
    WORK_END,
    WORK_START,
    AvailableSlot,
    BookingCreate,
    NextAvailableResponse,
)


class BookingConflictError(Exception):
    """
    Raised when an attempted booking overlaps with an existing reservation in the same room.
    Stores the conflicting booking model instance so routers can return exact details to the client.
    """
    def __init__(self, message: str, conflicting_booking: Booking):
        super().__init__(message)
        self.message = message
        self.conflicting_booking = conflicting_booking


class RoomNotFoundError(Exception):
    """Raised when a specified room ID does not exist in the database."""


class InvalidDurationError(Exception):
    """Raised when an invalid duration is requested for slot finding."""


def get_bookings(
    db: Session,
    room_id: int | None = None,
    booking_date: date | None = None,
) -> list[Booking]:
    """
    Retrieve bookings with optional filtering by room and date.
    Leverages indexed columns (room_id, booking_date, start_time) for efficient sorting.
    """
    query = db.query(Booking)

    if room_id is not None:
        query = query.filter(Booking.room_id == room_id)

    if booking_date is not None:
        query = query.filter(Booking.booking_date == booking_date)

    return query.order_by(Booking.booking_date.asc(), Booking.start_time.asc()).all()


def get_booking_by_id(db: Session, booking_id: int) -> Booking | None:
    """Retrieve a single booking by ID."""
    return db.query(Booking).filter(Booking.id == booking_id).first()


def find_conflicting_booking(
    db: Session,
    room_id: int,
    booking_date: date,
    start_time: time,
    end_time: time,
    exclude_booking_id: int | None = None,
) -> Booking | None:
    """
    Detects if a given time range overlaps with any existing booking for the specified room and date.

    MATHEMATICAL OVERLAP PRINCIPLE:
    Two half-open time intervals [S1, E1) and [S2, E2) overlap if and only if:
        S1 < E2  AND  S2 < E1
    Equivalently:
        max(S1, S2) < min(E1, E2)

    WHY THIS HANDLES ALL REQUIRED CASES:
    1. Partial overlap at beginning (e.g., existing 10:00-11:00, new 09:30-10:30):
       10:00 < 10:30 (True) AND 09:30 < 11:00 (True) -> Overlap!
    2. Partial overlap at end (e.g., existing 10:00-11:00, new 10:30-11:30):
       10:00 < 11:30 (True) AND 10:30 < 11:00 (True) -> Overlap!
    3. New booking fully containing existing (e.g., existing 10:00-11:00, new 09:30-11:30):
       10:00 < 11:30 (True) AND 09:30 < 11:00 (True) -> Overlap!
    4. Existing booking fully containing new (e.g., existing 09:30-11:30, new 10:00-11:00):
       09:30 < 11:00 (True) AND 10:00 < 11:30 (True) -> Overlap!
    5. Identical time ranges (e.g., 10:00-11:00 == 10:00-11:00):
       10:00 < 11:00 (True) AND 10:00 < 11:00 (True) -> Overlap!
    6. BACK-TO-BACK BOOKINGS MUST BE ALLOWED (e.g., existing 10:00-11:00, new 11:00-12:00):
       10:00 < 12:00 (True), BUT S2 < E1 is 11:00 < 11:00 (False!)
       Because the inequality is strict (<), contiguous / back-to-back bookings do NOT conflict.
    """
    query = db.query(Booking).filter(
        Booking.room_id == room_id,
        Booking.booking_date == booking_date,
        Booking.start_time < end_time,
        Booking.end_time > start_time,
    )

    if exclude_booking_id is not None:
        query = query.filter(Booking.id != exclude_booking_id)

    return query.first()


def create_booking(db: Session, booking_in: BookingCreate) -> Booking:
    """
    Creates a new booking after verifying room existence and ensuring no conflicts exist.
    """
    # 1. Verify target room exists
    room = db.query(Room).filter(Room.id == booking_in.room_id).first()
    if not room:
        raise RoomNotFoundError(f"Room with ID {booking_in.room_id} does not exist.")

    # 2. Check for time collisions with existing reservations
    conflict = find_conflicting_booking(
        db=db,
        room_id=booking_in.room_id,
        booking_date=booking_in.date,
        start_time=booking_in.start_time,
        end_time=booking_in.end_time,
    )

    if conflict:
        # Construct an explicit, informative error identifying the conflicting booking
        conflict_msg = (
            f"Time slot conflicts with existing booking '{conflict.title}' "
            f"({conflict.start_time.strftime('%H:%M')} - {conflict.end_time.strftime('%H:%M')}) "
            f"in room '{room.name}'."
        )
        raise BookingConflictError(message=conflict_msg, conflicting_booking=conflict)

    # 3. Persist new booking
    new_booking = Booking(
        room_id=booking_in.room_id,
        title=booking_in.title,
        booking_date=booking_in.date,
        start_time=booking_in.start_time,
        end_time=booking_in.end_time,
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking


def delete_booking(db: Session, booking_id: int) -> bool:
    """
    Cancels / deletes a booking by its primary key.
    Returns True if deleted, False if not found.
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        return False

    db.delete(booking)
    db.commit()
    return True


def time_to_minutes(t: time) -> int:
    """Convert time object to total minutes since midnight."""
    return t.hour * 60 + t.minute


def minutes_to_time(m: int) -> time:
    """Convert minutes since midnight to time object."""
    hours = m // 60
    minutes = m % 60
    return time(hour=hours, minute=minutes)


def find_next_available_slot(
    db: Session,
    room_id: int,
    booking_date: date,
    duration_minutes: int,
) -> NextAvailableResponse:
    """
    Finds the earliest continuous available slot of at least `duration_minutes`
    within working hours (09:00 - 18:00) on the requested date.

    ALGORITHM SPECIFICATION (NO EXTERNAL SCHEDULING LIBRARIES):
    1. Working hours span from 09:00 (540 minutes) to 18:00 (1080 minutes).
    2. We fetch all existing bookings for the room on this date, ordered chronologically by start_time.
    3. We maintain `current_pointer` initialized to 09:00.
    4. For each booking in chronological order:
       - The gap before this booking begins at `current_pointer` and ends at `booking.start_time`.
       - If (booking.start_time - current_pointer) >= duration_minutes:
         -> We have found the earliest available slot! Return [current_pointer, current_pointer + duration].
       - Otherwise, advance `current_pointer` to max(current_pointer, booking.end_time) to step over the booked block.
    5. After evaluating all bookings:
       - Check the gap between `current_pointer` and end of working hours (18:00).
       - If (18:00 - current_pointer) >= duration_minutes:
         -> Earliest slot found after the last booking! Return [current_pointer, current_pointer + duration].
    6. If no gap of sufficient size is found, the room is fully booked for this duration.

    EDGE CASES HANDLED:
    - Gap before first booking: Handled by step 4 on the first iteration.
    - Gaps between bookings: Handled by step 4 on subsequent iterations.
    - Gap after last booking: Handled by step 5.
    - Gap exactly equal to duration: (start - pointer) >= duration returns True when equal.
    - Fully booked room: Returns available=False with a clear message.
    - Out of range duration (<=0 or > 540 minutes): Validated and rejected cleanly.
    """
    # 1. Validate room exists
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise RoomNotFoundError(f"Room with ID {room_id} does not exist.")

    # 2. Validate requested duration
    total_working_minutes = time_to_minutes(WORK_END) - time_to_minutes(WORK_START)  # 540 mins
    if duration_minutes <= 0:
        raise InvalidDurationError("Duration must be a positive integer greater than 0 minutes.")
    if duration_minutes > total_working_minutes:
        msg = (
            f"Requested duration ({duration_minutes}m) exceeds "
            f"total working day ({total_working_minutes}m: 09:00 to 18:00)."
        )
        return NextAvailableResponse(
            room_id=room.id,
            room_name=room.name,
            date=booking_date,
            duration_minutes=duration_minutes,
            available=False,
            slot=None,
            message=msg,
        )

    # 3. Retrieve existing bookings for this room and date, ordered by start time
    existing_bookings = (
        db.query(Booking)
        .filter(Booking.room_id == room_id, Booking.booking_date == booking_date)
        .order_by(Booking.start_time.asc())
        .all()
    )

    work_start_m = time_to_minutes(WORK_START)
    work_end_m = time_to_minutes(WORK_END)

    current_pointer_m = work_start_m

    for b in existing_bookings:
        b_start_m = time_to_minutes(b.start_time)
        b_end_m = time_to_minutes(b.end_time)

        # Check gap between current pointer and this booking's start
        gap = b_start_m - current_pointer_m
        if gap >= duration_minutes:
            # Earliest slot found!
            slot_start = minutes_to_time(current_pointer_m)
            slot_end = minutes_to_time(current_pointer_m + duration_minutes)
            return NextAvailableResponse(
                room_id=room.id,
                room_name=room.name,
                date=booking_date,
                duration_minutes=duration_minutes,
                available=True,
                slot=AvailableSlot(
                    start_time=slot_start.strftime("%H:%M"),
                    end_time=slot_end.strftime("%H:%M"),
                ),
                message=f"Available slot found from {slot_start.strftime('%H:%M')} to {slot_end.strftime('%H:%M')}.",
            )

        # Move pointer past the current booking if it extends beyond current pointer
        current_pointer_m = max(current_pointer_m, b_end_m)

    # 4. Check gap after the last booking up to closing time (18:00)
    gap_at_end = work_end_m - current_pointer_m
    if gap_at_end >= duration_minutes:
        slot_start = minutes_to_time(current_pointer_m)
        slot_end = minutes_to_time(current_pointer_m + duration_minutes)
        return NextAvailableResponse(
            room_id=room.id,
            room_name=room.name,
            date=booking_date,
            duration_minutes=duration_minutes,
            available=True,
            slot=AvailableSlot(
                start_time=slot_start.strftime("%H:%M"),
                end_time=slot_end.strftime("%H:%M"),
            ),
            message=f"Available slot found from {slot_start.strftime('%H:%M')} to {slot_end.strftime('%H:%M')}.",
        )

    # 5. No slot available
    date_str = booking_date.strftime("%Y-%m-%d")
    return NextAvailableResponse(
        room_id=room.id,
        room_name=room.name,
        date=booking_date,
        duration_minutes=duration_minutes,
        available=False,
        slot=None,
        message=f"No available slot of {duration_minutes} minutes found for '{room.name}' on {date_str}.",
    )

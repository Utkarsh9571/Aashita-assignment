"""
Unit tests directly targeting booking_service functions without HTTP layer.
"""
from datetime import date, time

import pytest

from app.models.room import Room
from app.schemas.booking import BookingCreate
from app.services import booking_service


def test_service_validate_booking_time_bounds_success():
    """Valid interval inside 09:00 - 18:00 does not raise."""
    booking_service.validate_booking_time_bounds(time(9, 0), time(10, 0))
    booking_service.validate_booking_time_bounds(time(17, 0), time(18, 0))


def test_service_validate_booking_time_bounds_errors():
    """Invalid intervals raise BookingValidationError with clear messages."""
    # Start before 09:00
    with pytest.raises(booking_service.BookingValidationError, match="before opening hours"):
        booking_service.validate_booking_time_bounds(time(8, 59), time(10, 0))

    # End after 18:00
    with pytest.raises(booking_service.BookingValidationError, match="exceed closing hours"):
        booking_service.validate_booking_time_bounds(time(17, 0), time(18, 1))

    # Equal start and end
    with pytest.raises(booking_service.BookingValidationError, match="cannot be equal to start time"):
        booking_service.validate_booking_time_bounds(time(12, 0), time(12, 0))

    # End before start
    with pytest.raises(booking_service.BookingValidationError, match="must be strictly after start time"):
        booking_service.validate_booking_time_bounds(time(14, 0), time(13, 0))


def test_service_conflict_detection_and_creation(db_session):
    """Direct service call creates a booking and properly raises BookingConflictError on overlap."""
    room = db_session.query(Room).first()
    assert room is not None

    booking_date = date(2026, 12, 10)

    # 1. Create initial booking
    b1 = booking_service.create_booking(
        db_session,
        BookingCreate(
            room_id=room.id,
            title="Design Sprint",
            date=booking_date,
            start_time=time(10, 0),
            end_time=time(12, 0),
        ),
    )
    assert b1.id is not None

    # 2. Attempt conflict
    with pytest.raises(booking_service.BookingConflictError) as exc_info:
        booking_service.create_booking(
            db_session,
            BookingCreate(
                room_id=room.id,
                title="Design Sprint Overlap",
                date=booking_date,
                start_time=time(11, 0),
                end_time=time(13, 0),
            ),
        )
    assert exc_info.value.conflicting_booking.id == b1.id
    assert "Design Sprint" in exc_info.value.message

    # 3. Non-overlapping back-to-back booking succeeds
    b2 = booking_service.create_booking(
        db_session,
        BookingCreate(
            room_id=room.id,
            title="Afternoon Follow-up",
            date=booking_date,
            start_time=time(12, 0),
            end_time=time(13, 0),
        ),
    )
    assert b2.id is not None

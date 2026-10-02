from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.booking import (
    BookingCreate,
    BookingResponse,
    ConflictingBookingInfo,
)
from app.services import booking_service, room_service

router = APIRouter(prefix="/api/bookings", tags=["Bookings"])


@router.get("", response_model=list[BookingResponse], summary="List and filter bookings")
def list_bookings(
    date: date | None = Query(None, description="Filter bookings by date (YYYY-MM-DD)"),
    room_id: int | None = Query(None, description="Filter bookings by room ID"),
    db: Session = Depends(get_db),
):
    """
    Retrieve bookings with optional filters for room and date.
    Optimized with PostgreSQL composite indexes on (room_id, booking_date).
    """
    if room_id is not None:
        room = room_service.get_room_by_id(db, room_id)
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Room with ID {room_id} was not found.",
            )
    return booking_service.get_bookings(db, room_id=room_id, booking_date=date)


@router.get("/{booking_id}", response_model=BookingResponse, summary="Get booking by ID")
def get_booking(booking_id: int, db: Session = Depends(get_db)):
    """Retrieve details of a single booking."""
    booking = booking_service.get_booking_by_id(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with ID {booking_id} was not found.",
        )
    return booking


@router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new meeting room booking",
)
def create_booking(
    booking_in: BookingCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new booking with rigorous conflict detection.
    Rejects:
    - Times outside 09:00 - 18:00
    - Start time >= End time
    - Overlapping bookings (partial, contained, containing, identical)

    Permits:
    - Back-to-back bookings (e.g. 10:00-11:00 and 11:00-12:00)
    """
    try:
        return booking_service.create_booking(db, booking_in)
    except booking_service.BookingValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e
    except booking_service.RoomNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        ) from e
    except booking_service.BookingConflictError as e:
        conflict_data = ConflictingBookingInfo.from_orm_model(e.conflicting_booking)
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": e.message,
                "conflicting_booking": conflict_data.model_dump(mode="json", by_alias=True),
            },
        )


@router.delete(
    "/{booking_id}",
    summary="Cancel a booking",
)
def cancel_booking(booking_id: int, db: Session = Depends(get_db)):
    """
    Cancels an existing booking. Returns 200 with confirmation message, or 404 if not found.
    """
    booking = booking_service.get_booking_by_id(db, booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with ID {booking_id} was not found or has already been cancelled.",
        )

    title = booking.title
    deleted = booking_service.delete_booking(db, booking_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with ID {booking_id} could not be cancelled.",
        )

    return {
        "success": True,
        "message": f"Booking '{title}' has been successfully cancelled.",
        "booking_id": booking_id,
    }

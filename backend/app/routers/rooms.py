from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.booking import BookingResponse, NextAvailableResponse
from app.schemas.room import RoomResponse
from app.services import booking_service, room_service

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])


@router.get("", response_model=list[RoomResponse], summary="List all meeting rooms")
def list_rooms(db: Session = Depends(get_db)):
    """Retrieve all available meeting rooms."""
    return room_service.get_all_rooms(db)


@router.get("/{room_id}", response_model=RoomResponse, summary="Get room details by ID")
def get_room(room_id: int, db: Session = Depends(get_db)):
    """Retrieve details for a specific room."""
    room = room_service.get_room_by_id(db, room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with ID {room_id} was not found.",
        )
    return room


@router.get(
    "/{room_id}/bookings",
    response_model=list[BookingResponse],
    summary="Get room bookings for a date",
)
def get_room_bookings(
    room_id: int,
    date: date | None = Query(None, description="Filter bookings for this date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
):
    """Retrieve all bookings for a given room, optionally filtered by date."""
    room = room_service.get_room_by_id(db, room_id)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with ID {room_id} was not found.",
        )
    return booking_service.get_bookings(db, room_id=room_id, booking_date=date)


@router.get(
    "/{room_id}/next-available",
    response_model=NextAvailableResponse,
    summary="Find earliest available meeting slot",
)
def get_next_available_slot(
    room_id: int,
    date: date = Query(..., description="Target date (YYYY-MM-DD)"),
    duration: int = Query(..., ge=1, le=540, description="Meeting duration in minutes (e.g., 30, 45, 60)"),
    db: Session = Depends(get_db),
):
    """
    Finds the earliest available continuous slot of the given duration on the selected date.
    Respects 09:00 - 18:00 working hours and considers pre-booking, inter-booking, and post-booking gaps.
    """
    try:
        return booking_service.find_next_available_slot(
            db=db,
            room_id=room_id,
            booking_date=date,
            duration_minutes=duration,
        )
    except booking_service.RoomNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except booking_service.InvalidDurationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

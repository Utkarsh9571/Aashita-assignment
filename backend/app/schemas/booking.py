from datetime import date as date_type
from datetime import datetime
from datetime import time as time_type
from typing import Any

from pydantic import (
    AliasChoices,
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

WORK_START = time_type(9, 0)
WORK_END = time_type(18, 0)


class BookingBase(BaseModel):
    room_id: int = Field(..., gt=0, description="Target room ID")
    title: str = Field(..., min_length=1, max_length=200, description="Meeting title / purpose")
    date: date_type = Field(
        ...,
        validation_alias=AliasChoices("date", "booking_date"),
        serialization_alias="date",
        description="Booking date (YYYY-MM-DD)",
    )
    start_time: time_type = Field(..., description="Start time (HH:MM or HH:MM:SS)")
    end_time: time_type = Field(..., description="End time (HH:MM or HH:MM:SS)")


class BookingCreate(BookingBase):
    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Meeting title cannot be empty or whitespace only.")
        return trimmed

    @model_validator(mode="after")
    def validate_timing(self) -> "BookingCreate":
        # 1. Enforce that end time is strictly after start time
        if self.end_time <= self.start_time:
            start_str = self.start_time.strftime("%H:%M")
            end_str = self.end_time.strftime("%H:%M")
            if self.end_time == self.start_time:
                raise ValueError(f"End time ({end_str}) cannot be equal to start time ({start_str}).")
            raise ValueError(f"End time ({end_str}) must be strictly after start time ({start_str}).")

        # 2. Enforce working hours: 09:00 - 18:00
        if self.start_time < WORK_START:
            raise ValueError(
                f"Booking start time ({self.start_time.strftime('%H:%M')}) cannot be before opening hours (09:00)."
            )
        if self.end_time > WORK_END:
            raise ValueError(
                f"Booking end time ({self.end_time.strftime('%H:%M')}) cannot exceed closing hours (18:00)."
            )

        return self


class ConflictingBookingInfo(BaseModel):
    id: int
    room_id: int
    room_name: str | None = None
    title: str
    booking_date: date_type = Field(serialization_alias="date")
    start_time: str
    end_time: str

    @classmethod
    def from_orm_model(cls, booking: Any) -> "ConflictingBookingInfo":
        room_name = booking.room.name if getattr(booking, "room", None) else None
        return cls(
            id=booking.id,
            room_id=booking.room_id,
            room_name=room_name,
            title=booking.title,
            booking_date=booking.booking_date,
            start_time=booking.start_time.strftime("%H:%M"),
            end_time=booking.end_time.strftime("%H:%M"),
        )


class BookingResponse(BaseModel):
    id: int
    room_id: int
    room_name: str | None = None
    title: str
    date: date_type = Field(validation_alias=AliasChoices("date", "booking_date"), serialization_alias="date")
    start_time: str
    end_time: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def map_orm_fields(cls, data: Any) -> Any:
        if hasattr(data, "__dict__") or hasattr(data, "start_time"):
            start_val = data.start_time
            end_val = data.end_time
            start_str = start_val.strftime("%H:%M") if isinstance(start_val, time_type) else str(start_val)
            end_str = end_val.strftime("%H:%M") if isinstance(end_val, time_type) else str(end_val)
            room_name = data.room.name if getattr(data, "room", None) else None
            return {
                "id": data.id,
                "room_id": data.room_id,
                "room_name": room_name,
                "title": data.title,
                "date": getattr(data, "booking_date", getattr(data, "date", None)),
                "start_time": start_str,
                "end_time": end_str,
                "created_at": data.created_at,
            }
        return data


class AvailableSlot(BaseModel):
    start_time: str
    end_time: str


class NextAvailableResponse(BaseModel):
    room_id: int
    room_name: str | None = None
    date: date_type
    duration_minutes: int
    available: bool
    slot: AvailableSlot | None = None
    message: str

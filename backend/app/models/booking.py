from datetime import UTC, datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Index, Integer, String, Time
from sqlalchemy.orm import relationship

from app.db.session import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_id = Column(
        Integer,
        ForeignKey("rooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title = Column(String(200), nullable=False)
    booking_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationship back to room
    room = relationship("Room", back_populates="bookings")

    # Composite indexes for high-performance scheduling queries:
    # 1. Lookups by room and date (used for conflict checks and schedule views)
    # 2. Lookups ordered by start_time for timeline rendering and next available calculations
    __table_args__ = (
        Index("ix_bookings_room_date", "room_id", "booking_date"),
        Index("ix_bookings_room_date_start", "room_id", "booking_date", "start_time"),
    )

    def __repr__(self) -> str:
        return (
            f"<Booking(id={self.id}, room_id={self.room_id}, title='{self.title}', "
            f"date={self.booking_date}, {self.start_time}-{self.end_time})>"
        )

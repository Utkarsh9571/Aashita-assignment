from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.db.session import Base


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    capacity = Column(Integer, nullable=False)
    location = Column(String(255), nullable=True)
    amenities = Column(String(500), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    # 1-to-many relationship with bookings
    bookings = relationship(
        "Booking",
        back_populates="room",
        cascade="all, delete-orphan",
        order_by="Booking.start_time",
    )

    def __repr__(self) -> str:
        return f"<Room(id={self.id}, name='{self.name}', capacity={self.capacity})>"

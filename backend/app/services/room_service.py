
from sqlalchemy.orm import Session

from app.models.room import Room


def get_all_rooms(db: Session) -> list[Room]:
    """Retrieve all meeting rooms ordered by ID."""
    return db.query(Room).order_by(Room.id.asc()).all()


def get_room_by_id(db: Session, room_id: int) -> Room | None:
    """Retrieve a single room by its primary key ID."""
    return db.query(Room).filter(Room.id == room_id).first()

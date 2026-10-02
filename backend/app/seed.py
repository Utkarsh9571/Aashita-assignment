from typing import Any

from sqlalchemy.orm import Session

from app.db.session import Base, SessionLocal, engine
from app.models.room import Room

INITIAL_ROOMS: list[dict[str, Any]] = [
    {
        "name": "Boardroom Alpha",
        "capacity": 16,
        "location": "Floor 4, Executive Wing",
        "amenities": "Dual 4K Displays, Video Conference Bar, Glass Whiteboard, Conference Phone",
    },
    {
        "name": "Creative Lab",
        "capacity": 8,
        "location": "Floor 2, Innovation Wing",
        "amenities": "Smart Interactive Projector, Magnetic Whiteboard, Modular Desks, Workshop Toolkit",
    },
    {
        "name": "Focus Pod Aurora",
        "capacity": 4,
        "location": "Floor 1, Quiet Zone",
        "amenities": "Ultrawide 34-inch Monitor, Acoustic Noise Dampening, Ergonomic Chairs",
    },
    {
        "name": "Nexus Conference Hall",
        "capacity": 24,
        "location": "Floor 3, Central Hub",
        "amenities": "Dual 85-inch Screens, Ceiling Microphone Array, Stage Podium, Wireless Casting",
    },
    {
        "name": "Strategy Suite",
        "capacity": 10,
        "location": "Floor 4, West Wing",
        "amenities": "Interactive Touch Display, Conference Speakerphone, Standing Meeting Height Table",
    },
]


def seed_rooms(db: Session) -> int:
    """
    Seeds the 5 initial meeting rooms if the rooms table is empty.
    Returns the number of rooms seeded.
    """
    existing_count = db.query(Room).count()
    if existing_count > 0:
        return 0

    rooms_to_add = [Room(**room_data) for room_data in INITIAL_ROOMS]
    db.add_all(rooms_to_add)
    db.commit()
    return len(rooms_to_add)


def run_seed():
    """CLI runner to create tables and seed default rooms."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = seed_rooms(db)
        if count > 0:
            print(f"Successfully seeded {count} initial meeting rooms.")
        else:
            print("Meeting rooms already seeded. Skipping.")
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()

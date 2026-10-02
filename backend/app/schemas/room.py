from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class RoomBase(BaseModel):
    name: str = Field(..., max_length=100, description="Unique room name")
    capacity: int = Field(..., gt=0, description="Maximum seating capacity")
    location: str | None = Field(None, max_length=255, description="Floor or building location")
    amenities: str | None = Field(None, max_length=500, description="Available equipment and amenities")


class RoomResponse(RoomBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

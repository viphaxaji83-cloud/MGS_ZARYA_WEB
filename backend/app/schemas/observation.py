from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ObservationResponse(BaseModel):
    id: int
    site_id: int
    camera_id: Optional[int] = None
    image_url: Optional[str] = None
    captured_at: datetime
    fill_level: float
    status: str
    ai_confidence: float
    has_overflow: bool
    has_litter_outside: bool
    has_anomaly: bool

    class Config:
        from_attributes = True

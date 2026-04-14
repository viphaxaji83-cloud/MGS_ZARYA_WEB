from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SiteBase(BaseModel):
    code: str
    name: str
    address: str
    district: Optional[str] = None
    lat: float
    lon: float
    type: str = "standard"
    container_count: int = 0
    description: Optional[str] = None


class SiteCreate(SiteBase):
    camera_id: Optional[int] = None


class SiteUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    district: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    type: Optional[str] = None
    container_count: Optional[int] = None
    description: Optional[str] = None
    camera_id: Optional[int] = None
    is_active: Optional[bool] = None


class SiteResponse(SiteBase):
    id: int
    status: str
    fill_level: float
    ai_confidence: float
    has_overflow: bool
    has_litter_outside: bool
    camera_id: Optional[int] = None
    last_capture_at: Optional[datetime] = None
    last_image_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SiteListResponse(BaseModel):
    items: list[SiteResponse]
    total: int

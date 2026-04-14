from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CameraBase(BaseModel):
    code: str
    name: str
    source_url: Optional[str] = None
    polling_interval_sec: int = 300


class CameraCreate(CameraBase):
    site_id: Optional[int] = None


class CameraUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    source_url: Optional[str] = None
    status: Optional[str] = None
    polling_interval_sec: Optional[int] = None
    site_id: Optional[int] = None
    is_active: Optional[bool] = None


class CameraResponse(CameraBase):
    id: int
    status: str
    last_seen_at: Optional[datetime] = None
    error_count: int
    site_id: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

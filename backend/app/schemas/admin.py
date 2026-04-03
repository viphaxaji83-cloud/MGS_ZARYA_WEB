from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PlatformSettingResponse(BaseModel):
    id: int
    key: str
    value: Optional[str] = None
    value_type: str
    description: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class PlatformSettingUpdate(BaseModel):
    value: str


class SystemStatusResponse(BaseModel):
    backend_status: str
    database_status: str
    storage_status: str
    live_updates_status: str
    active_cameras: int
    offline_cameras: int
    sites_without_data: int
    active_alerts: int
    last_system_update: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: int
    actor_user_id: int
    actor_role: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    payload_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

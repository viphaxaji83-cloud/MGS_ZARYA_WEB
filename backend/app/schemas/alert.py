from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AlertResponse(BaseModel):
    id: int
    site_id: int
    type: str
    severity: str
    status: str
    message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    acknowledged_by: Optional[int] = None

    class Config:
        from_attributes = True


class AlertUpdate(BaseModel):
    status: Optional[str] = None

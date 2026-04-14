from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: str = Field(min_length=3, max_length=255)
    login: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=72)
    role: str = "operator"


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    email: Optional[str] = Field(default=None, min_length=3, max_length=255)
    login: Optional[str] = Field(default=None, min_length=3, max_length=100)
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserPasswordSet(BaseModel):
    password: str = Field(min_length=8, max_length=72)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    login: str
    role: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

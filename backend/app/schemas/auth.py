from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    login: str
    password: str
    remember_me: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class MeResponse(BaseModel):
    id: int
    name: str
    email: str
    login: str
    role: str
    is_active: bool
    last_login_at: Optional[str] = None

    class Config:
        from_attributes = True

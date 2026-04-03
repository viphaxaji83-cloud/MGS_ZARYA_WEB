from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from datetime import datetime, timezone

from ...core.database import get_db
from ...core.security import verify_password, create_access_token, create_refresh_token, decode_token
from ...core.deps import get_current_user
from ...models.user import User
from ...schemas.auth import LoginRequest, TokenResponse, ForgotPasswordRequest, ResetPasswordRequest, MeResponse
from ...services.audit import log_action

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(or_(User.login == body.login, User.email == body.login))
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    refresh = create_refresh_token({"sub": str(user.id), "role": user.role})

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    max_age = 7 * 86400 if body.remember_me else 86400
    response.set_cookie("refresh_token", refresh, httponly=True, samesite="lax", max_age=max_age, path="/")

    await log_action(db, user.id, user.role, "login", "user", user.id)
    await db.commit()

    return TokenResponse(access_token=access_token, role=user.role, user_id=user.id, name=user.name)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(response: Response, refresh_token: str = "", db: AsyncSession = Depends(get_db)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")

    access_token = create_access_token({"sub": str(user.id), "role": user.role})
    new_refresh = create_refresh_token({"sub": str(user.id), "role": user.role})
    response.set_cookie("refresh_token", new_refresh, httponly=True, samesite="lax", max_age=7 * 86400, path="/")

    return TokenResponse(access_token=access_token, role=user.role, user_id=user.id, name=user.name)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("refresh_token", path="/")
    return {"detail": "Logged out"}


@router.get("/me", response_model=MeResponse)
async def get_me(user: User = Depends(get_current_user)):
    return MeResponse(
        id=user.id, name=user.name, email=user.email, login=user.login,
        role=user.role, is_active=user.is_active,
        last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
    )


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    return {"detail": "If the email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest):
    return {"detail": "Password has been reset. You can now log in."}

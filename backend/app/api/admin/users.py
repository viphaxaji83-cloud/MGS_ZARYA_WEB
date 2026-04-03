from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from ...core.database import get_db
from ...core.deps import require_admin
from ...core.security import hash_password
from ...models.user import User
from ...schemas.user import UserCreate, UserUpdate, UserResponse
from ...services.audit import log_action

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = select(User)
    if role:
        q = q.where(User.role == role)
    if is_active is not None:
        q = q.where(User.is_active == is_active)
    if search:
        q = q.where(User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%") | User.login.ilike(f"%{search}%"))
    q = q.order_by(User.id)
    result = await db.execute(q)
    return [UserResponse.model_validate(u) for u in result.scalars().all()]


@router.post("", response_model=UserResponse)
async def create_user(body: UserCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    existing = await db.execute(select(User).where((User.login == body.login) | (User.email == body.email)))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this login or email already exists")

    user = User(
        name=body.name, email=body.email, login=body.login,
        password_hash=hash_password(body.password), role=body.role,
    )
    db.add(user)
    await db.flush()
    await log_action(db, admin.id, admin.role, "create_user", "user", user.id, {"name": body.name, "role": body.role})
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, body: UserUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    changes = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
        changes[field] = value

    await log_action(db, admin.id, admin.role, "update_user", "user", user_id, changes)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/{user_id}/reset-password")
async def reset_user_password(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    temp_password = "TempPass123!"
    user.password_hash = hash_password(temp_password)
    await log_action(db, admin.id, admin.role, "reset_password", "user", user_id)
    await db.commit()
    return {"detail": "Password has been reset", "temporary_password": temp_password}


@router.post("/{user_id}/deactivate")
async def deactivate_user(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    await log_action(db, admin.id, admin.role, "deactivate_user", "user", user_id)
    await db.commit()
    return {"detail": "User deactivated"}


@router.post("/{user_id}/activate")
async def activate_user(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    await log_action(db, admin.id, admin.role, "activate_user", "user", user_id)
    await db.commit()
    return {"detail": "User activated"}

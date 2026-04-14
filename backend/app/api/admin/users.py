from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_, select
from typing import Optional

from ...core.database import get_db
from ...core.deps import require_admin
from ...core.security import hash_password
from ...models.user import User
from ...schemas.user import UserCreate, UserPasswordSet, UserResponse, UserUpdate
from ...services.audit import log_action

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


async def _get_user_or_404(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def _has_other_user_with_credentials(
    db: AsyncSession,
    *,
    login: str,
    email: str,
    exclude_user_id: Optional[int] = None,
) -> bool:
    query = select(User).where(or_(User.login == login, User.email == email))
    if exclude_user_id is not None:
        query = query.where(User.id != exclude_user_id)
    existing = await db.execute(query)
    return existing.scalar_one_or_none() is not None


async def _admin_count(db: AsyncSession, *, active_only: bool = False) -> int:
    query = select(User).where(User.role == "admin")
    if active_only:
        query = query.where(User.is_active.is_(True))
    result = await db.execute(query)
    return len(result.scalars().all())


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
    login = body.login.strip()
    email = body.email.strip().lower()
    name = body.name.strip()

    if await _has_other_user_with_credentials(db, login=login, email=email):
        raise HTTPException(status_code=400, detail="User with this login or email already exists")

    user = User(
        name=name, email=email, login=login,
        password_hash=hash_password(body.password), role=body.role,
    )
    db.add(user)
    await db.flush()
    await log_action(db, admin.id, admin.role, "create_user", "user", user.id, {"name": name, "role": body.role})
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    user = await _get_user_or_404(db, user_id)
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, body: UserUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    user = await _get_user_or_404(db, user_id)

    changes = {}
    payload = body.model_dump(exclude_unset=True)

    if "login" in payload:
        payload["login"] = payload["login"].strip()
    if "email" in payload:
        payload["email"] = payload["email"].strip().lower()
    if "name" in payload:
        payload["name"] = payload["name"].strip()

    next_login = payload.get("login", user.login)
    next_email = payload.get("email", user.email)

    if await _has_other_user_with_credentials(
        db,
        login=next_login,
        email=next_email,
        exclude_user_id=user_id,
    ):
        raise HTTPException(status_code=400, detail="User with this login or email already exists")

    next_role = payload.get("role", user.role)
    next_is_active = payload.get("is_active", user.is_active)

    if user.role == "admin" and (next_role != "admin" or not next_is_active):
        admins_total = await _admin_count(db, active_only=True)
        if admins_total <= 1:
            raise HTTPException(status_code=400, detail="Cannot change the last administrator")

    for field, value in payload.items():
        setattr(user, field, value)
        changes[field] = value

    await log_action(db, admin.id, admin.role, "update_user", "user", user_id, changes)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/{user_id}/set-password")
async def set_user_password(
    user_id: int,
    body: UserPasswordSet,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = await _get_user_or_404(db, user_id)
    user.password_hash = hash_password(body.password)
    await log_action(db, admin.id, admin.role, "set_password", "user", user_id)
    await db.commit()
    return {"detail": "Password updated"}


@router.delete("/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    user = await _get_user_or_404(db, user_id)

    if user.role == "admin" and user.is_active:
        admins_total = await _admin_count(db, active_only=True)
        if admins_total <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last administrator")

    await log_action(
        db,
        admin.id,
        admin.role,
        "delete_user",
        "user",
        user_id,
        {"name": user.name, "login": user.login, "role": user.role},
    )
    await db.delete(user)
    await db.commit()
    return {"detail": "User deleted"}

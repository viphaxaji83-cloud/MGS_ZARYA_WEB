from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from ...core.database import get_db
from ...core.deps import require_admin
from ...models.camera import Camera
from ...models.user import User
from ...schemas.camera import CameraCreate, CameraUpdate, CameraResponse
from ...services.audit import log_action

router = APIRouter(prefix="/admin/cameras", tags=["admin-cameras"])


@router.get("", response_model=list[CameraResponse])
async def list_cameras(
    status: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = select(Camera)
    if status:
        q = q.where(Camera.status == status)
    if is_active is not None:
        q = q.where(Camera.is_active == is_active)
    q = q.order_by(Camera.id)
    result = await db.execute(q)
    return [CameraResponse.model_validate(c) for c in result.scalars().all()]


@router.post("", response_model=CameraResponse)
async def create_camera(body: CameraCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    cam = Camera(code=body.code, name=body.name, source_url=body.source_url,
                 polling_interval_sec=body.polling_interval_sec, site_id=body.site_id)
    db.add(cam)
    await db.flush()
    await log_action(db, admin.id, admin.role, "create_camera", "camera", cam.id, {"code": body.code})
    await db.commit()
    await db.refresh(cam)
    return CameraResponse.model_validate(cam)


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(camera_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    return CameraResponse.model_validate(cam)


@router.patch("/{camera_id}", response_model=CameraResponse)
async def update_camera(camera_id: int, body: CameraUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    changes = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(cam, field, value)
        changes[field] = value
    await log_action(db, admin.id, admin.role, "update_camera", "camera", camera_id, changes)
    await db.commit()
    await db.refresh(cam)
    return CameraResponse.model_validate(cam)


@router.post("/{camera_id}/assign-site")
async def assign_site(camera_id: int, site_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    cam.site_id = site_id
    await log_action(db, admin.id, admin.role, "assign_camera_site", "camera", camera_id, {"site_id": site_id})
    await db.commit()
    return {"detail": "Camera assigned to site"}


@router.post("/{camera_id}/unassign-site")
async def unassign_site(camera_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    cam = result.scalar_one_or_none()
    if not cam:
        raise HTTPException(status_code=404, detail="Camera not found")
    old_site = cam.site_id
    cam.site_id = None
    await log_action(db, admin.id, admin.role, "unassign_camera_site", "camera", camera_id, {"old_site_id": old_site})
    await db.commit()
    return {"detail": "Camera unassigned from site"}

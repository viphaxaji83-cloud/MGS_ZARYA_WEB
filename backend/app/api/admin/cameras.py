from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.database import get_db
from ...core.deps import require_admin
from ...models.camera import Camera
from ...models.site import Site
from ...models.user import User
from ...schemas.camera import CameraCreate, CameraResponse, CameraUpdate
from ...services.audit import log_action

router = APIRouter(prefix="/admin/cameras", tags=["admin-cameras"])


async def _get_camera_or_404(db: AsyncSession, camera_id: int) -> Camera:
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera


async def _get_site_or_404(db: AsyncSession, site_id: int) -> Site:
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site


async def _get_camera_by_code(db: AsyncSession, code: str, *, exclude_id: Optional[int] = None) -> Optional[Camera]:
    query = select(Camera).where(Camera.code == code)
    if exclude_id is not None:
        query = query.where(Camera.id != exclude_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def _sync_camera_site_binding(db: AsyncSession, camera: Camera, next_site_id: Optional[int]) -> None:
    current_site_id = camera.site_id

    if current_site_id is not None:
        current_site_result = await db.execute(select(Site).where(Site.id == current_site_id))
        current_site = current_site_result.scalar_one_or_none()
        if current_site and current_site.camera_id == camera.id and current_site_id != next_site_id:
            current_site.camera_id = None

    if next_site_id is None:
        camera.site_id = None
        return

    next_site = await _get_site_or_404(db, next_site_id)

    if next_site.camera_id is not None and next_site.camera_id != camera.id:
        previous_camera_result = await db.execute(select(Camera).where(Camera.id == next_site.camera_id))
        previous_camera = previous_camera_result.scalar_one_or_none()
        if previous_camera and previous_camera.site_id == next_site.id:
            previous_camera.site_id = None

    camera.site_id = next_site.id
    next_site.camera_id = camera.id


@router.get("", response_model=list[CameraResponse])
async def list_cameras(
    status: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = select(Camera)
    if status:
        query = query.where(Camera.status == status)
    if is_active is not None:
        query = query.where(Camera.is_active == is_active)
    query = query.order_by(Camera.id)
    result = await db.execute(query)
    return [CameraResponse.model_validate(camera) for camera in result.scalars().all()]


@router.post("", response_model=CameraResponse)
async def create_camera(body: CameraCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    code = body.code.strip().upper()
    name = body.name.strip()
    source_url = body.source_url.strip() if body.source_url else None

    if await _get_camera_by_code(db, code):
        raise HTTPException(status_code=400, detail="Camera with this code already exists")

    camera = Camera(
        code=code,
        name=name,
        source_url=source_url,
        polling_interval_sec=body.polling_interval_sec,
    )
    db.add(camera)
    await db.flush()

    if body.site_id is not None:
        await _sync_camera_site_binding(db, camera, body.site_id)

    await log_action(db, admin.id, admin.role, "create_camera", "camera", camera.id, {"code": camera.code})
    await db.commit()
    await db.refresh(camera)
    return CameraResponse.model_validate(camera)


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(camera_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    camera = await _get_camera_or_404(db, camera_id)
    return CameraResponse.model_validate(camera)


@router.patch("/{camera_id}", response_model=CameraResponse)
async def update_camera(camera_id: int, body: CameraUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    camera = await _get_camera_or_404(db, camera_id)
    payload = body.model_dump(exclude_unset=True)
    changes = {}

    if "code" in payload:
        payload["code"] = payload["code"].strip().upper()
        if await _get_camera_by_code(db, payload["code"], exclude_id=camera_id):
            raise HTTPException(status_code=400, detail="Camera with this code already exists")

    if "name" in payload:
        payload["name"] = payload["name"].strip()

    if "source_url" in payload:
        payload["source_url"] = payload["source_url"].strip() if payload["source_url"] else None

    next_site_id = payload.pop("site_id", None) if "site_id" in payload else camera.site_id
    site_changed = "site_id" in body.model_fields_set

    for field, value in payload.items():
        setattr(camera, field, value)
        changes[field] = value

    if site_changed:
        await _sync_camera_site_binding(db, camera, next_site_id)
        changes["site_id"] = next_site_id

    await log_action(db, admin.id, admin.role, "update_camera", "camera", camera_id, changes)
    await db.commit()
    await db.refresh(camera)
    return CameraResponse.model_validate(camera)


@router.post("/{camera_id}/assign-site")
async def assign_site(camera_id: int, site_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    camera = await _get_camera_or_404(db, camera_id)
    await _sync_camera_site_binding(db, camera, site_id)
    await log_action(db, admin.id, admin.role, "assign_camera_site", "camera", camera_id, {"site_id": site_id})
    await db.commit()
    return {"detail": "Camera assigned to site"}


@router.post("/{camera_id}/unassign-site")
async def unassign_site(camera_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    camera = await _get_camera_or_404(db, camera_id)
    old_site_id = camera.site_id
    await _sync_camera_site_binding(db, camera, None)
    await log_action(db, admin.id, admin.role, "unassign_camera_site", "camera", camera_id, {"old_site_id": old_site_id})
    await db.commit()
    return {"detail": "Camera unassigned from site"}


@router.delete("/{camera_id}")
async def delete_camera(camera_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    camera = await _get_camera_or_404(db, camera_id)
    old_site_id = camera.site_id
    await _sync_camera_site_binding(db, camera, None)
    await log_action(
        db,
        admin.id,
        admin.role,
        "delete_camera",
        "camera",
        camera_id,
        {"code": camera.code, "name": camera.name, "old_site_id": old_site_id},
    )
    await db.delete(camera)
    await db.commit()
    return {"detail": "Camera deleted"}

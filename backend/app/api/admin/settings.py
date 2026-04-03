from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from typing import Optional
from datetime import datetime, timezone

from ...core.database import get_db
from ...core.deps import require_admin
from ...models.platform_setting import PlatformSetting
from ...models.audit_log import AuditLog
from ...models.camera import Camera
from ...models.site import Site
from ...models.alert import Alert
from ...models.user import User
from ...schemas.admin import PlatformSettingResponse, PlatformSettingUpdate, SystemStatusResponse, AuditLogResponse
from ...services.audit import log_action

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/settings", response_model=list[PlatformSettingResponse])
async def list_settings(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(PlatformSetting).order_by(PlatformSetting.key))
    return [PlatformSettingResponse.model_validate(s) for s in result.scalars().all()]


@router.patch("/settings", response_model=list[PlatformSettingResponse])
async def update_settings(
    updates: dict[str, str],
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    changed = []
    for key, value in updates.items():
        result = await db.execute(select(PlatformSetting).where(PlatformSetting.key == key))
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = value
            setting.updated_by = admin.id
            changed.append(setting)

    await log_action(db, admin.id, admin.role, "update_settings", "platform_setting", None, updates)
    await db.commit()

    result = await db.execute(select(PlatformSetting).order_by(PlatformSetting.key))
    return [PlatformSettingResponse.model_validate(s) for s in result.scalars().all()]


@router.get("/system/status", response_model=SystemStatusResponse)
async def system_status(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    try:
        await db.execute(text("SELECT 1"))
        db_status = "ok"
    except Exception:
        db_status = "error"

    active_cams = (await db.execute(
        select(func.count(Camera.id)).where(Camera.is_active == True, Camera.status == "online")
    )).scalar() or 0

    offline_cams = (await db.execute(
        select(func.count(Camera.id)).where(Camera.is_active == True, Camera.status != "online")
    )).scalar() or 0

    no_data_sites = (await db.execute(
        select(func.count(Site.id)).where(Site.is_active == True, Site.status == "no_data")
    )).scalar() or 0

    active_alerts = (await db.execute(
        select(func.count(Alert.id)).where(Alert.status.in_(["new", "viewed"]))
    )).scalar() or 0

    return SystemStatusResponse(
        backend_status="ok",
        database_status=db_status,
        storage_status="ok",
        live_updates_status="ok",
        active_cameras=active_cams,
        offline_cameras=offline_cams,
        sites_without_data=no_data_sites,
        active_alerts=active_alerts,
        last_system_update=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/audit-log", response_model=list[AuditLogResponse])
async def list_audit_log(
    actor_user_id: Optional[int] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = select(AuditLog)
    if actor_user_id:
        q = q.where(AuditLog.actor_user_id == actor_user_id)
    if action:
        q = q.where(AuditLog.action == action)
    if entity_type:
        q = q.where(AuditLog.entity_type == entity_type)
    q = q.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return [AuditLogResponse.model_validate(a) for a in result.scalars().all()]

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from ...core.database import get_db
from ...core.deps import require_admin
from ...models.site import Site
from ...models.user import User
from ...schemas.site import SiteCreate, SiteUpdate, SiteResponse
from ...services.audit import log_action

router = APIRouter(prefix="/admin/sites", tags=["admin-sites"])


@router.get("", response_model=list[SiteResponse])
async def list_sites(
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    q = select(Site).order_by(Site.id)
    if is_active is not None:
        q = q.where(Site.is_active == is_active)
    result = await db.execute(q)
    return [SiteResponse.model_validate(s) for s in result.scalars().all()]


@router.post("", response_model=SiteResponse)
async def create_site(body: SiteCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    site = Site(**body.model_dump())
    db.add(site)
    await db.flush()
    await log_action(db, admin.id, admin.role, "create_site", "site", site.id, {"code": body.code})
    await db.commit()
    await db.refresh(site)
    return SiteResponse.model_validate(site)


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(site_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return SiteResponse.model_validate(site)


@router.patch("/{site_id}", response_model=SiteResponse)
async def update_site(site_id: int, body: SiteUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    changes = {}
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(site, field, value)
        changes[field] = value
    await log_action(db, admin.id, admin.role, "update_site", "site", site_id, changes)
    await db.commit()
    await db.refresh(site)
    return SiteResponse.model_validate(site)


@router.post("/{site_id}/archive")
async def archive_site(site_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    site.is_active = False
    await log_action(db, admin.id, admin.role, "archive_site", "site", site_id)
    await db.commit()
    return {"detail": "Site archived"}

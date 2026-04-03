from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from ...core.database import get_db
from ...core.deps import get_current_user
from ...models.site import Site
from ...models.observation import Observation
from ...models.alert import Alert
from ...schemas.site import SiteResponse, SiteListResponse
from ...schemas.observation import ObservationResponse
from ...schemas.alert import AlertResponse

router = APIRouter(prefix="/sites", tags=["sites"])


@router.get("", response_model=SiteListResponse)
async def list_sites(
    status: Optional[str] = None,
    district: Optional[str] = None,
    search: Optional[str] = None,
    has_alert: Optional[bool] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    q = select(Site).where(Site.is_active == True)
    if status:
        q = q.where(Site.status == status)
    if district:
        q = q.where(Site.district == district)
    if search:
        q = q.where(Site.name.ilike(f"%{search}%") | Site.address.ilike(f"%{search}%") | Site.code.ilike(f"%{search}%"))

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    q = q.order_by(Site.id).limit(limit).offset(offset)
    result = await db.execute(q)
    sites = result.scalars().all()

    return SiteListResponse(items=[SiteResponse.model_validate(s) for s in sites], total=total)


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(site_id: int, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return SiteResponse.model_validate(site)


@router.get("/{site_id}/observations", response_model=list[ObservationResponse])
async def get_site_observations(
    site_id: int, limit: int = Query(50, le=200), db: AsyncSession = Depends(get_db), user=Depends(get_current_user)
):
    result = await db.execute(
        select(Observation).where(Observation.site_id == site_id).order_by(Observation.captured_at.desc()).limit(limit)
    )
    return [ObservationResponse.model_validate(o) for o in result.scalars().all()]


@router.get("/{site_id}/alerts", response_model=list[AlertResponse])
async def get_site_alerts(
    site_id: int, limit: int = Query(50, le=200), db: AsyncSession = Depends(get_db), user=Depends(get_current_user)
):
    result = await db.execute(
        select(Alert).where(Alert.site_id == site_id).order_by(Alert.created_at.desc()).limit(limit)
    )
    return [AlertResponse.model_validate(a) for a in result.scalars().all()]

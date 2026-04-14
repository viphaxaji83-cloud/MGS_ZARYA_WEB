from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select
from typing import Optional
import httpx

from ...core.database import get_db
from ...core.deps import require_admin
from ...models.alert import Alert
from ...models.camera import Camera
from ...models.observation import Observation
from ...models.site import Site
from ...models.user import User
from ...schemas.site import SiteCreate, SiteUpdate, SiteResponse
from ...services.audit import log_action

router = APIRouter(prefix="/admin/sites", tags=["admin-sites"])


async def _get_site_or_404(db: AsyncSession, site_id: int) -> Site:
    result = await db.execute(select(Site).where(Site.id == site_id))
    site = result.scalar_one_or_none()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site


async def _get_site_by_code(db: AsyncSession, code: str, *, exclude_id: Optional[int] = None) -> Optional[Site]:
    query = select(Site).where(Site.code == code)
    if exclude_id is not None:
        query = query.where(Site.id != exclude_id)
    result = await db.execute(query)
    return result.scalar_one_or_none()


@router.get("/geocode")
async def geocode_site_address(
    address: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    query = address.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Address is required")

    candidates: list[str] = [query]
    if "майкоп" not in query.lower():
        candidates.append(f"{query}, Майкоп")

    params = {
        "format": "jsonv2",
        "limit": 1,
        "countrycodes": "ru",
        "addressdetails": 1,
    }
    headers = {
        "User-Agent": "ZaryaPlatform/1.0",
        "Accept-Language": "ru",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0, headers=headers, follow_redirects=True) as client:
            for candidate in dict.fromkeys(candidates):
                response = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={**params, "q": candidate},
                )
                response.raise_for_status()
                data = response.json()

                if not data:
                    continue

                item = data[0]
                return {
                    "lat": float(item["lat"]),
                    "lon": float(item["lon"]),
                    "query": candidate,
                    "resolved_address": item.get("display_name"),
                }
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="Geocoding service is unavailable") from exc

    raise HTTPException(status_code=404, detail="Coordinates not found for this address")


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
    payload = body.model_dump()
    payload["code"] = payload["code"].strip().upper()
    payload["name"] = payload["name"].strip()
    payload["address"] = payload["address"].strip()
    payload["district"] = payload["district"].strip() if payload.get("district") else None

    if await _get_site_by_code(db, payload["code"]):
        raise HTTPException(status_code=400, detail="Site with this code already exists")

    site = Site(**payload)
    db.add(site)
    await db.flush()
    await log_action(db, admin.id, admin.role, "create_site", "site", site.id, {"code": site.code})
    await db.commit()
    await db.refresh(site)
    return SiteResponse.model_validate(site)


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(site_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    site = await _get_site_or_404(db, site_id)
    return SiteResponse.model_validate(site)


@router.patch("/{site_id}", response_model=SiteResponse)
async def update_site(site_id: int, body: SiteUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    site = await _get_site_or_404(db, site_id)
    changes = {}
    payload = body.model_dump(exclude_unset=True)

    if "code" in payload:
        payload["code"] = payload["code"].strip().upper()
        if await _get_site_by_code(db, payload["code"], exclude_id=site_id):
            raise HTTPException(status_code=400, detail="Site with this code already exists")
    if "name" in payload:
        payload["name"] = payload["name"].strip()
    if "address" in payload:
        payload["address"] = payload["address"].strip()
    if "district" in payload:
        payload["district"] = payload["district"].strip() if payload["district"] else None

    for field, value in payload.items():
        setattr(site, field, value)
        changes[field] = value
    await log_action(db, admin.id, admin.role, "update_site", "site", site_id, changes)
    await db.commit()
    await db.refresh(site)
    return SiteResponse.model_validate(site)


@router.delete("/{site_id}")
async def delete_site(site_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    site = await _get_site_or_404(db, site_id)

    camera_result = await db.execute(select(Camera).where(Camera.site_id == site_id))
    cameras = camera_result.scalars().all()
    for camera in cameras:
        camera.site_id = None

    if site.camera_id is not None:
        linked_camera = await db.execute(select(Camera).where(Camera.id == site.camera_id))
        linked_camera_obj = linked_camera.scalar_one_or_none()
        if linked_camera_obj and linked_camera_obj.site_id == site_id:
            linked_camera_obj.site_id = None

    await db.execute(delete(Observation).where(Observation.site_id == site_id))
    await db.execute(delete(Alert).where(Alert.site_id == site_id))
    await log_action(
        db,
        admin.id,
        admin.role,
        "delete_site",
        "site",
        site_id,
        {"code": site.code, "name": site.name},
    )
    await db.delete(site)
    await db.commit()
    return {"detail": "Site deleted"}

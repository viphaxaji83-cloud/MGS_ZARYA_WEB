from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ...core.database import get_db
from ...core.deps import get_current_user
from ...models.site import Site
from ...models.camera import Camera
from ...models.alert import Alert
from ...schemas.dashboard import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def get_summary(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    sites_result = await db.execute(select(Site).where(Site.is_active == True))
    sites = sites_result.scalars().all()

    total = len(sites)
    normal = sum(1 for s in sites if s.status == "normal")
    warning = sum(1 for s in sites if s.status == "warning")
    critical = sum(1 for s in sites if s.status == "critical")
    no_data = sum(1 for s in sites if s.status == "no_data")
    offline = sum(1 for s in sites if s.status == "offline")

    cams_result = await db.execute(select(Camera).where(Camera.is_active == True))
    cams = cams_result.scalars().all()
    cams_online = sum(1 for c in cams if c.status == "online")
    cams_offline = sum(1 for c in cams if c.status != "online")

    alerts_result = await db.execute(select(func.count(Alert.id)).where(Alert.status.in_(["new", "viewed"])))
    active_alerts = alerts_result.scalar() or 0

    avg_fill = sum(s.fill_level for s in sites) / total if total > 0 else 0.0

    return DashboardSummary(
        total_sites=total, sites_normal=normal, sites_warning=warning,
        sites_critical=critical, sites_no_data=no_data, sites_offline=offline,
        cameras_online=cams_online, cameras_offline=cams_offline,
        active_alerts=active_alerts, avg_fill_level=round(avg_fill, 1),
    )

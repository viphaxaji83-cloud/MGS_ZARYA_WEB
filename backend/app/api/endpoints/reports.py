from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime, timedelta, timezone

from ...core.database import get_db
from ...core.deps import get_current_user
from ...models.site import Site
from ...models.alert import Alert
from ...models.observation import Observation
from ...models.camera import Camera

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/summary")
async def report_summary(
    period_days: int = Query(7, le=90),
    district: Optional[str] = None,
    site_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    since = datetime.now(timezone.utc) - timedelta(days=period_days)

    alert_q = select(func.count(Alert.id)).where(Alert.created_at >= since)
    if site_id:
        alert_q = alert_q.where(Alert.site_id == site_id)

    total_alerts = (await db.execute(alert_q)).scalar() or 0

    critical_q = select(func.count(Alert.id)).where(Alert.created_at >= since, Alert.severity == "critical")
    if site_id:
        critical_q = critical_q.where(Alert.site_id == site_id)
    critical_alerts = (await db.execute(critical_q)).scalar() or 0

    obs_q = select(func.count(Observation.id)).where(Observation.captured_at >= since)
    if site_id:
        obs_q = obs_q.where(Observation.site_id == site_id)
    total_observations = (await db.execute(obs_q)).scalar() or 0

    sites_q = select(func.count(Site.id)).where(Site.is_active == True)
    if district:
        sites_q = sites_q.where(Site.district == district)
    total_sites = (await db.execute(sites_q)).scalar() or 0

    cams_offline = (await db.execute(
        select(func.count(Camera.id)).where(Camera.status != "online", Camera.is_active == True)
    )).scalar() or 0

    # Daily alert breakdown
    daily_alerts = []
    for i in range(period_days):
        day = since + timedelta(days=i)
        day_end = day + timedelta(days=1)
        dq = select(func.count(Alert.id)).where(Alert.created_at >= day, Alert.created_at < day_end)
        if site_id:
            dq = dq.where(Alert.site_id == site_id)
        count = (await db.execute(dq)).scalar() or 0
        daily_alerts.append({"date": day.strftime("%Y-%m-%d"), "count": count})

    return {
        "period_days": period_days,
        "total_alerts": total_alerts,
        "critical_alerts": critical_alerts,
        "total_observations": total_observations,
        "total_sites": total_sites,
        "cameras_offline": cams_offline,
        "daily_alerts": daily_alerts,
    }

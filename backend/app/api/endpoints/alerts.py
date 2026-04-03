from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from ...core.database import get_db
from ...core.deps import get_current_user
from ...models.alert import Alert
from ...models.user import User
from ...schemas.alert import AlertResponse, AlertUpdate

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    type: Optional[str] = None,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    site_id: Optional[int] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    q = select(Alert)
    if type:
        q = q.where(Alert.type == type)
    if status:
        q = q.where(Alert.status == status)
    if severity:
        q = q.where(Alert.severity == severity)
    if site_id:
        q = q.where(Alert.site_id == site_id)
    q = q.order_by(Alert.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return [AlertResponse.model_validate(a) for a in result.scalars().all()]


@router.patch("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: int, body: AlertUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if body.status:
        alert.status = body.status
        if body.status in ("confirmed", "closed", "false_positive"):
            alert.acknowledged_by = user.id
    await db.commit()
    await db.refresh(alert)
    return AlertResponse.model_validate(alert)

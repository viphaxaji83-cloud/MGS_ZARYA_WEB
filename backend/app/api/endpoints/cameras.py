from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ...core.database import get_db
from ...core.deps import get_current_user
from ...models.camera import Camera
from ...schemas.camera import CameraResponse

router = APIRouter(prefix="/cameras", tags=["cameras"])


@router.get("", response_model=list[CameraResponse])
async def list_cameras(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    result = await db.execute(select(Camera).where(Camera.is_active == True).order_by(Camera.id))
    return [CameraResponse.model_validate(c) for c in result.scalars().all()]

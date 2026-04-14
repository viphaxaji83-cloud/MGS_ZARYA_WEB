import asyncio
import random
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ...core.database import async_session
from ...core.fill_levels import status_from_fill_level
from ...models.alert import Alert

router = APIRouter(tags=["websocket"])

connected_clients: list[WebSocket] = []


@router.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        connected_clients.remove(websocket)


async def broadcast(message: dict):
    for client in connected_clients[:]:
        try:
            await client.send_json(message)
        except Exception:
            connected_clients.remove(client)


async def live_simulator():
    """Periodically sends mock status updates to connected clients."""
    while True:
        await asyncio.sleep(15)
        if not connected_clients:
            continue

        site_id = random.randint(1, 30)
        fill = round(random.uniform(10, 95), 1)
        status = status_from_fill_level(fill)

        await broadcast({
            "type": "site_update",
            "data": {
                "site_id": site_id,
                "fill_level": fill,
                "status": status,
                "ai_confidence": round(random.uniform(0.7, 0.99), 2),
                "last_capture_at": datetime.now(timezone.utc).isoformat(),
            }
        })

        if random.random() > 0.7:
            alert_types = ["overflow", "litter", "degradation", "camera_offline"]
            alert_site_id = random.randint(1, 30)
            alert_type = random.choice(alert_types)
            alert_severity = random.choice(["low", "medium", "high", "critical"])
            alert_created_at = datetime.now(timezone.utc)
            alert_message = "Автоматически обнаружено изменение состояния"

            async with async_session() as session:
                alert = Alert(
                    site_id=alert_site_id,
                    type=alert_type,
                    severity=alert_severity,
                    status="new",
                    message=alert_message,
                    created_at=alert_created_at,
                )
                session.add(alert)
                await session.flush()
                await session.commit()

            await broadcast({
                "type": "new_alert",
                "data": {
                    "alert_id": alert.id,
                    "site_id": alert_site_id,
                    "alert_type": alert_type,
                    "severity": alert_severity,
                    "message": alert_message,
                    "created_at": alert_created_at.isoformat(),
                }
            })

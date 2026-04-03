import asyncio
import json
import random
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

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

        statuses = ["normal", "warning", "critical", "no_data"]
        site_id = random.randint(1, 30)
        fill = round(random.uniform(10, 95), 1)
        status = "normal" if fill < 60 else "warning" if fill < 85 else "critical"

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
            await broadcast({
                "type": "new_alert",
                "data": {
                    "site_id": random.randint(1, 30),
                    "alert_type": random.choice(alert_types),
                    "severity": random.choice(["low", "medium", "high", "critical"]),
                    "message": "Автоматически обнаружено изменение состояния",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            })

from sqlalchemy.ext.asyncio import AsyncSession
from ..models.audit_log import AuditLog
import json


async def log_action(
    db: AsyncSession,
    actor_user_id: int,
    actor_role: str,
    action: str,
    entity_type: str = None,
    entity_id: int = None,
    payload: dict = None,
):
    entry = AuditLog(
        actor_user_id=actor_user_id,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        payload_json=json.dumps(payload, default=str) if payload else None,
    )
    db.add(entry)
    await db.flush()

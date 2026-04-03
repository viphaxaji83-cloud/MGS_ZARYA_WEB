"""
Seed data for ЗАРЯ monitoring platform — Maykop city demo.
Run: python -m app.seeds.seed_data
"""
import asyncio
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy import text

from ..core.database import engine, async_session, Base
from ..core.security import hash_password
from ..models.user import User
from ..models.site import Site
from ..models.camera import Camera
from ..models.observation import Observation
from ..models.alert import Alert
from ..models.platform_setting import PlatformSetting
from ..models.audit_log import AuditLog

USERS = [
    {"name": "Администратор", "email": "admin@zarya.local", "login": "admin", "password": "admin12345", "role": "admin"},
    {"name": "Иванов Алексей", "email": "ivanov@zarya.local", "login": "operator", "password": "operator12345", "role": "operator"},
    {"name": "Петрова Мария", "email": "petrova@zarya.local", "login": "operator2", "password": "operator12345", "role": "operator"},
]

DISTRICTS = ["Центральный", "Западный", "Восточный", "Северный", "Южный"]

SITES_DATA = [
    {"code": "MKP-001", "name": "КП ул. Краснооктябрьская 15", "address": "ул. Краснооктябрьская, 15, Майкоп", "district": "Центральный", "lat": 44.6078, "lon": 40.1058, "container_count": 4},
    {"code": "MKP-002", "name": "КП ул. Жуковского 22", "address": "ул. Жуковского, 22, Майкоп", "district": "Центральный", "lat": 44.6095, "lon": 40.0985, "container_count": 3},
    {"code": "MKP-003", "name": "КП ул. Пионерская 8", "address": "ул. Пионерская, 8, Майкоп", "district": "Центральный", "lat": 44.6112, "lon": 40.1020, "container_count": 5},
    {"code": "MKP-004", "name": "КП ул. Первомайская 180", "address": "ул. Первомайская, 180, Майкоп", "district": "Центральный", "lat": 44.6065, "lon": 40.0942, "container_count": 4},
    {"code": "MKP-005", "name": "КП ул. Гоголя 45", "address": "ул. Гоголя, 45, Майкоп", "district": "Центральный", "lat": 44.6050, "lon": 40.1075, "container_count": 3},
    {"code": "MKP-006", "name": "КП ул. Хакурате 200", "address": "ул. Хакурате, 200, Майкоп", "district": "Западный", "lat": 44.6130, "lon": 40.0880, "container_count": 6},
    {"code": "MKP-007", "name": "КП ул. Шоссейная 12", "address": "ул. Шоссейная, 12, Майкоп", "district": "Западный", "lat": 44.6155, "lon": 40.0835, "container_count": 4},
    {"code": "MKP-008", "name": "КП ул. Промышленная 5", "address": "ул. Промышленная, 5, Майкоп", "district": "Западный", "lat": 44.6180, "lon": 40.0790, "container_count": 8},
    {"code": "MKP-009", "name": "КП ул. Калинина 78", "address": "ул. Калинина, 78, Майкоп", "district": "Западный", "lat": 44.6108, "lon": 40.0860, "container_count": 3},
    {"code": "MKP-010", "name": "КП ул. Пушкина 150", "address": "ул. Пушкина, 150, Майкоп", "district": "Западный", "lat": 44.6140, "lon": 40.0920, "container_count": 5},
    {"code": "MKP-011", "name": "КП ул. Юннатов 30", "address": "ул. Юннатов, 30, Майкоп", "district": "Восточный", "lat": 44.6020, "lon": 40.1200, "container_count": 4},
    {"code": "MKP-012", "name": "КП ул. Депутатская 10", "address": "ул. Депутатская, 10, Майкоп", "district": "Восточный", "lat": 44.6045, "lon": 40.1180, "container_count": 3},
    {"code": "MKP-013", "name": "КП ул. Курганная 44", "address": "ул. Курганная, 44, Майкоп", "district": "Восточный", "lat": 44.6000, "lon": 40.1250, "container_count": 5},
    {"code": "MKP-014", "name": "КП ул. Ленина 95", "address": "ул. Ленина, 95, Майкоп", "district": "Восточный", "lat": 44.6035, "lon": 40.1150, "container_count": 4},
    {"code": "MKP-015", "name": "КП ул. Советская 210", "address": "ул. Советская, 210, Майкоп", "district": "Восточный", "lat": 44.5990, "lon": 40.1280, "container_count": 6},
    {"code": "MKP-016", "name": "КП ул. Димитрова 55", "address": "ул. Димитрова, 55, Майкоп", "district": "Северный", "lat": 44.6200, "lon": 40.1000, "container_count": 3},
    {"code": "MKP-017", "name": "КП ул. Чкалова 18", "address": "ул. Чкалова, 18, Майкоп", "district": "Северный", "lat": 44.6225, "lon": 40.0960, "container_count": 4},
    {"code": "MKP-018", "name": "КП ул. Комсомольская 130", "address": "ул. Комсомольская, 130, Майкоп", "district": "Северный", "lat": 44.6250, "lon": 40.1040, "container_count": 5},
    {"code": "MKP-019", "name": "КП ул. Гагарина 25", "address": "ул. Гагарина, 25, Майкоп", "district": "Северный", "lat": 44.6210, "lon": 40.1080, "container_count": 4},
    {"code": "MKP-020", "name": "КП ул. Свободы 90", "address": "ул. Свободы, 90, Майкоп", "district": "Северный", "lat": 44.6235, "lon": 40.1020, "container_count": 3},
    {"code": "MKP-021", "name": "КП ул. Привокзальная 7", "address": "ул. Привокзальная, 7, Майкоп", "district": "Южный", "lat": 44.5950, "lon": 40.1000, "container_count": 4},
    {"code": "MKP-022", "name": "КП ул. Заводская 33", "address": "ул. Заводская, 33, Майкоп", "district": "Южный", "lat": 44.5930, "lon": 40.0950, "container_count": 6},
    {"code": "MKP-023", "name": "КП ул. Садовая 60", "address": "ул. Садовая, 60, Майкоп", "district": "Южный", "lat": 44.5965, "lon": 40.1050, "container_count": 3},
    {"code": "MKP-024", "name": "КП ул. Школьная 14", "address": "ул. Школьная, 14, Майкоп", "district": "Южный", "lat": 44.5940, "lon": 40.1100, "container_count": 4},
    {"code": "MKP-025", "name": "КП ул. Победы 100", "address": "ул. Победы, 100, Майкоп", "district": "Южный", "lat": 44.5980, "lon": 40.0980, "container_count": 5},
    {"code": "MKP-026", "name": "КП ул. Кирова 48", "address": "ул. Кирова, 48, Майкоп", "district": "Центральный", "lat": 44.6088, "lon": 40.1005, "container_count": 4},
    {"code": "MKP-027", "name": "КП ул. Некрасова 72", "address": "ул. Некрасова, 72, Майкоп", "district": "Западный", "lat": 44.6165, "lon": 40.0850, "container_count": 3},
    {"code": "MKP-028", "name": "КП ул. Мира 115", "address": "ул. Мира, 115, Майкоп", "district": "Восточный", "lat": 44.6010, "lon": 40.1220, "container_count": 5},
    {"code": "MKP-029", "name": "КП ул. Строителей 40", "address": "ул. Строителей, 40, Майкоп", "district": "Северный", "lat": 44.6240, "lon": 40.0980, "container_count": 4},
    {"code": "MKP-030", "name": "КП ул. Молодёжная 20", "address": "ул. Молодёжная, 20, Майкоп", "district": "Южный", "lat": 44.5955, "lon": 40.1070, "container_count": 3},
]

PLATFORM_SETTINGS = [
    {"key": "dashboard_refresh_interval", "value": "30", "value_type": "int", "description": "Интервал автообновления dashboard (секунды)"},
    {"key": "fill_level_warning_threshold", "value": "60", "value_type": "int", "description": "Порог заполненности для статуса 'внимание' (%)"},
    {"key": "fill_level_critical_threshold", "value": "85", "value_type": "int", "description": "Порог заполненности для статуса 'критично' (%)"},
    {"key": "alert_overflow_threshold", "value": "90", "value_type": "int", "description": "Порог генерации alert переполнения (%)"},
    {"key": "low_confidence_threshold", "value": "0.6", "value_type": "float", "description": "Порог низкой уверенности AI"},
    {"key": "no_data_timeout_minutes", "value": "120", "value_type": "int", "description": "Тайм-аут 'нет свежих данных' (минуты)"},
    {"key": "map_default_lat", "value": "44.6078", "value_type": "float", "description": "Широта центра карты по умолчанию"},
    {"key": "map_default_lon", "value": "40.1058", "value_type": "float", "description": "Долгота центра карты по умолчанию"},
    {"key": "map_default_zoom", "value": "13", "value_type": "int", "description": "Масштаб карты по умолчанию"},
    {"key": "notifications_enabled", "value": "true", "value_type": "bool", "description": "Уведомления включены"},
    {"key": "demo_mode", "value": "true", "value_type": "bool", "description": "Демо-режим платформы"},
]

ALERT_TYPES = ["overflow", "litter", "degradation", "camera_offline", "no_data", "ai_error"]
ALERT_SEVERITIES = ["low", "medium", "high", "critical"]
ALERT_STATUSES = ["new", "viewed", "confirmed", "closed", "false_positive"]
ALERT_MESSAGES = {
    "overflow": "Обнаружено переполнение контейнеров",
    "litter": "Обнаружен мусор вне контейнеров",
    "degradation": "Зафиксировано ухудшение состояния площадки",
    "camera_offline": "Камера не отвечает",
    "no_data": "Нет свежих данных с площадки",
    "ai_error": "Ошибка AI-обработки изображения",
}


def _random_status_and_fill():
    r = random.random()
    if r < 0.45:
        fill = round(random.uniform(10, 55), 1)
        return "normal", fill
    elif r < 0.70:
        fill = round(random.uniform(56, 84), 1)
        return "warning", fill
    elif r < 0.85:
        fill = round(random.uniform(85, 98), 1)
        return "critical", fill
    elif r < 0.93:
        return "no_data", 0.0
    else:
        return "offline", 0.0


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # Check if already seeded
        from sqlalchemy import select, func
        count = (await db.execute(select(func.count(User.id)))).scalar()
        if count > 0:
            print("Database already seeded. Skipping.")
            return

        now = datetime.now(timezone.utc)

        # Users
        users = []
        for u in USERS:
            user = User(name=u["name"], email=u["email"], login=u["login"],
                       password_hash=hash_password(u["password"]), role=u["role"])
            db.add(user)
            users.append(user)
        await db.flush()
        print(f"Created {len(users)} users")

        # Cameras
        cameras = []
        for i in range(1, 31):
            cam_status = "online" if random.random() < 0.8 else random.choice(["offline", "error"])
            last_seen = now - timedelta(minutes=random.randint(1, 300)) if cam_status == "online" else now - timedelta(hours=random.randint(2, 48))
            cam = Camera(
                code=f"CAM-{i:03d}", name=f"Камера {i:03d}",
                source_url=f"rtsp://cam{i}.zarya.local/stream",
                status=cam_status, polling_interval_sec=300,
                last_seen_at=last_seen,
                error_count=0 if cam_status == "online" else random.randint(1, 25),
                site_id=i,
            )
            db.add(cam)
            cameras.append(cam)
        await db.flush()
        print(f"Created {len(cameras)} cameras")

        # Sites
        sites = []
        for i, sd in enumerate(SITES_DATA):
            status, fill = _random_status_and_fill()
            cam = cameras[i]
            if cam.status != "online":
                status = "offline"
                fill = 0.0

            confidence = round(random.uniform(0.75, 0.99), 2) if status not in ("no_data", "offline") else 0.0
            has_overflow = fill > 85 and random.random() > 0.3
            has_litter = random.random() > 0.75 if status != "no_data" else False
            last_capture = now - timedelta(minutes=random.randint(5, 90)) if status != "no_data" else None

            site = Site(
                code=sd["code"], name=sd["name"], address=sd["address"],
                district=sd["district"], lat=sd["lat"], lon=sd["lon"],
                type="standard", container_count=sd["container_count"],
                status=status, fill_level=fill, ai_confidence=confidence,
                has_overflow=has_overflow, has_litter_outside=has_litter,
                camera_id=cam.id, last_capture_at=last_capture,
                last_image_url=f"/static/mock/site_{i+1}.jpg",
            )
            db.add(site)
            sites.append(site)
        await db.flush()
        print(f"Created {len(sites)} sites")

        # Observations — ~8 per site over last 48h
        obs_count = 0
        for site in sites:
            for j in range(8):
                hours_ago = random.uniform(1, 48)
                captured = now - timedelta(hours=hours_ago)
                o_fill = max(0, min(100, site.fill_level + random.uniform(-15, 15)))
                o_status = "normal" if o_fill < 60 else "warning" if o_fill < 85 else "critical"
                obs = Observation(
                    site_id=site.id, camera_id=site.camera_id,
                    image_url=f"/static/mock/obs_{site.id}_{j}.jpg",
                    captured_at=captured, fill_level=round(o_fill, 1),
                    status=o_status,
                    ai_confidence=round(random.uniform(0.7, 0.99), 2),
                    has_overflow=o_fill > 85 and random.random() > 0.4,
                    has_litter_outside=random.random() > 0.8,
                    has_anomaly=random.random() > 0.93,
                )
                db.add(obs)
                obs_count += 1
        await db.flush()
        print(f"Created {obs_count} observations")

        # Alerts
        alert_count = 0
        for site in sites:
            n_alerts = random.randint(0, 4)
            for _ in range(n_alerts):
                a_type = random.choice(ALERT_TYPES)
                severity_weights = {"low": 0.3, "medium": 0.4, "high": 0.2, "critical": 0.1}
                severity = random.choices(list(severity_weights.keys()), weights=list(severity_weights.values()))[0]
                a_status = random.choices(ALERT_STATUSES, weights=[0.3, 0.3, 0.15, 0.15, 0.1])[0]
                hours_ago = random.uniform(0.5, 168)
                alert = Alert(
                    site_id=site.id, type=a_type, severity=severity,
                    status=a_status, message=ALERT_MESSAGES[a_type],
                    created_at=now - timedelta(hours=hours_ago),
                    acknowledged_by=users[1].id if a_status in ("confirmed", "closed") else None,
                )
                db.add(alert)
                alert_count += 1
        await db.flush()
        print(f"Created {alert_count} alerts")

        # Platform settings
        for ps in PLATFORM_SETTINGS:
            db.add(PlatformSetting(**ps))
        await db.flush()
        print(f"Created {len(PLATFORM_SETTINGS)} platform settings")

        # Audit log entries
        db.add(AuditLog(actor_user_id=users[0].id, actor_role="admin", action="seed_database",
                        entity_type="system", payload_json='{"action": "initial_seed"}'))
        await db.flush()

        await db.commit()
        print("Seed complete!")
        print(f"\nDemo credentials:")
        print(f"  admin / admin12345")
        print(f"  operator / operator12345")
        print(f"  operator2 / operator12345")


def main():
    asyncio.run(seed())


if __name__ == "__main__":
    main()

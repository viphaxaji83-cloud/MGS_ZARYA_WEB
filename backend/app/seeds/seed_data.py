"""
Seed data for Р—РђР РЇ monitoring platform вЂ” Maykop city demo.
Run: python -m app.seeds.seed_data
"""
import asyncio
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy import text

from ..core.database import engine, async_session, Base
from ..core.fill_levels import CRITICAL_FILL_LEVEL, WARNING_FILL_LEVEL, status_from_fill_level
from ..core.security import hash_password
from ..models.user import User
from ..models.site import Site
from ..models.camera import Camera
from ..models.observation import Observation
from ..models.alert import Alert
from ..models.platform_setting import PlatformSetting
from ..models.audit_log import AuditLog

USERS = [
    {"name": "РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ", "email": "admin@zarya.local", "login": "admin", "password": "admin12345", "role": "admin"},
    {"name": "РРІР°РЅРѕРІ РђР»РµРєСЃРµР№", "email": "ivanov@zarya.local", "login": "operator", "password": "operator12345", "role": "operator"},
    {"name": "РџРµС‚СЂРѕРІР° РњР°СЂРёСЏ", "email": "petrova@zarya.local", "login": "operator2", "password": "operator12345", "role": "operator"},
]

DISTRICTS = ["Р¦РµРЅС‚СЂР°Р»СЊРЅС‹Р№", "Р—Р°РїР°РґРЅС‹Р№", "Р’РѕСЃС‚РѕС‡РЅС‹Р№", "РЎРµРІРµСЂРЅС‹Р№", "Р®Р¶РЅС‹Р№"]

SITES_DATA = [
    {"code": "MKP-001", "name": "РљРџ СѓР». РљСЂР°СЃРЅРѕРѕРєС‚СЏР±СЂСЊСЃРєР°СЏ 15", "address": "СѓР». РљСЂР°СЃРЅРѕРѕРєС‚СЏР±СЂСЊСЃРєР°СЏ, 15, РњР°Р№РєРѕРї", "district": "Р¦РµРЅС‚СЂР°Р»СЊРЅС‹Р№", "lat": 44.6078, "lon": 40.1058, "container_count": 4},
    {"code": "MKP-002", "name": "РљРџ СѓР». Р–СѓРєРѕРІСЃРєРѕРіРѕ 22", "address": "СѓР». Р–СѓРєРѕРІСЃРєРѕРіРѕ, 22, РњР°Р№РєРѕРї", "district": "Р¦РµРЅС‚СЂР°Р»СЊРЅС‹Р№", "lat": 44.6095, "lon": 40.0985, "container_count": 3},
    {"code": "MKP-003", "name": "РљРџ СѓР». РџРёРѕРЅРµСЂСЃРєР°СЏ 8", "address": "СѓР». РџРёРѕРЅРµСЂСЃРєР°СЏ, 8, РњР°Р№РєРѕРї", "district": "Р¦РµРЅС‚СЂР°Р»СЊРЅС‹Р№", "lat": 44.6112, "lon": 40.1020, "container_count": 5},
    {"code": "MKP-004", "name": "РљРџ СѓР». РџРµСЂРІРѕРјР°Р№СЃРєР°СЏ 180", "address": "СѓР». РџРµСЂРІРѕРјР°Р№СЃРєР°СЏ, 180, РњР°Р№РєРѕРї", "district": "Р¦РµРЅС‚СЂР°Р»СЊРЅС‹Р№", "lat": 44.6065, "lon": 40.0942, "container_count": 4},
    {"code": "MKP-005", "name": "РљРџ СѓР». Р“РѕРіРѕР»СЏ 45", "address": "СѓР». Р“РѕРіРѕР»СЏ, 45, РњР°Р№РєРѕРї", "district": "Р¦РµРЅС‚СЂР°Р»СЊРЅС‹Р№", "lat": 44.6050, "lon": 40.1075, "container_count": 3},
    {"code": "MKP-006", "name": "РљРџ СѓР». РҐР°РєСѓСЂР°С‚Рµ 200", "address": "СѓР». РҐР°РєСѓСЂР°С‚Рµ, 200, РњР°Р№РєРѕРї", "district": "Р—Р°РїР°РґРЅС‹Р№", "lat": 44.6130, "lon": 40.0880, "container_count": 6},
    {"code": "MKP-007", "name": "РљРџ СѓР». РЁРѕСЃСЃРµР№РЅР°СЏ 12", "address": "СѓР». РЁРѕСЃСЃРµР№РЅР°СЏ, 12, РњР°Р№РєРѕРї", "district": "Р—Р°РїР°РґРЅС‹Р№", "lat": 44.6155, "lon": 40.0835, "container_count": 4},
    {"code": "MKP-008", "name": "РљРџ СѓР». РџСЂРѕРјС‹С€Р»РµРЅРЅР°СЏ 5", "address": "СѓР». РџСЂРѕРјС‹С€Р»РµРЅРЅР°СЏ, 5, РњР°Р№РєРѕРї", "district": "Р—Р°РїР°РґРЅС‹Р№", "lat": 44.6180, "lon": 40.0790, "container_count": 8},
    {"code": "MKP-009", "name": "РљРџ СѓР». РљР°Р»РёРЅРёРЅР° 78", "address": "СѓР». РљР°Р»РёРЅРёРЅР°, 78, РњР°Р№РєРѕРї", "district": "Р—Р°РїР°РґРЅС‹Р№", "lat": 44.6108, "lon": 40.0860, "container_count": 3},
    {"code": "MKP-010", "name": "РљРџ СѓР». РџСѓС€РєРёРЅР° 150", "address": "СѓР». РџСѓС€РєРёРЅР°, 150, РњР°Р№РєРѕРї", "district": "Р—Р°РїР°РґРЅС‹Р№", "lat": 44.6140, "lon": 40.0920, "container_count": 5},
    {"code": "MKP-011", "name": "РљРџ СѓР». Р®РЅРЅР°С‚РѕРІ 30", "address": "СѓР». Р®РЅРЅР°С‚РѕРІ, 30, РњР°Р№РєРѕРї", "district": "Р’РѕСЃС‚РѕС‡РЅС‹Р№", "lat": 44.6020, "lon": 40.1200, "container_count": 4},
    {"code": "MKP-012", "name": "РљРџ СѓР». Р”РµРїСѓС‚Р°С‚СЃРєР°СЏ 10", "address": "СѓР». Р”РµРїСѓС‚Р°С‚СЃРєР°СЏ, 10, РњР°Р№РєРѕРї", "district": "Р’РѕСЃС‚РѕС‡РЅС‹Р№", "lat": 44.6045, "lon": 40.1180, "container_count": 3},
    {"code": "MKP-013", "name": "РљРџ СѓР». РљСѓСЂРіР°РЅРЅР°СЏ 44", "address": "СѓР». РљСѓСЂРіР°РЅРЅР°СЏ, 44, РњР°Р№РєРѕРї", "district": "Р’РѕСЃС‚РѕС‡РЅС‹Р№", "lat": 44.6000, "lon": 40.1250, "container_count": 5},
    {"code": "MKP-014", "name": "РљРџ СѓР». Р›РµРЅРёРЅР° 95", "address": "СѓР». Р›РµРЅРёРЅР°, 95, РњР°Р№РєРѕРї", "district": "Р’РѕСЃС‚РѕС‡РЅС‹Р№", "lat": 44.6035, "lon": 40.1150, "container_count": 4},
    {"code": "MKP-015", "name": "РљРџ СѓР». РЎРѕРІРµС‚СЃРєР°СЏ 210", "address": "СѓР». РЎРѕРІРµС‚СЃРєР°СЏ, 210, РњР°Р№РєРѕРї", "district": "Р’РѕСЃС‚РѕС‡РЅС‹Р№", "lat": 44.5990, "lon": 40.1280, "container_count": 6},
    {"code": "MKP-016", "name": "РљРџ СѓР». Р”РёРјРёС‚СЂРѕРІР° 55", "address": "СѓР». Р”РёРјРёС‚СЂРѕРІР°, 55, РњР°Р№РєРѕРї", "district": "РЎРµРІРµСЂРЅС‹Р№", "lat": 44.6200, "lon": 40.1000, "container_count": 3},
    {"code": "MKP-017", "name": "РљРџ СѓР». Р§РєР°Р»РѕРІР° 18", "address": "СѓР». Р§РєР°Р»РѕРІР°, 18, РњР°Р№РєРѕРї", "district": "РЎРµРІРµСЂРЅС‹Р№", "lat": 44.6225, "lon": 40.0960, "container_count": 4},
    {"code": "MKP-018", "name": "РљРџ СѓР». РљРѕРјСЃРѕРјРѕР»СЊСЃРєР°СЏ 130", "address": "СѓР». РљРѕРјСЃРѕРјРѕР»СЊСЃРєР°СЏ, 130, РњР°Р№РєРѕРї", "district": "РЎРµРІРµСЂРЅС‹Р№", "lat": 44.6250, "lon": 40.1040, "container_count": 5},
    {"code": "MKP-019", "name": "РљРџ СѓР». Р“Р°РіР°СЂРёРЅР° 25", "address": "СѓР». Р“Р°РіР°СЂРёРЅР°, 25, РњР°Р№РєРѕРї", "district": "РЎРµРІРµСЂРЅС‹Р№", "lat": 44.6210, "lon": 40.1080, "container_count": 4},
    {"code": "MKP-020", "name": "РљРџ СѓР». РЎРІРѕР±РѕРґС‹ 90", "address": "СѓР». РЎРІРѕР±РѕРґС‹, 90, РњР°Р№РєРѕРї", "district": "РЎРµРІРµСЂРЅС‹Р№", "lat": 44.6235, "lon": 40.1020, "container_count": 3},
    {"code": "MKP-021", "name": "РљРџ СѓР». РџСЂРёРІРѕРєР·Р°Р»СЊРЅР°СЏ 7", "address": "СѓР». РџСЂРёРІРѕРєР·Р°Р»СЊРЅР°СЏ, 7, РњР°Р№РєРѕРї", "district": "Р®Р¶РЅС‹Р№", "lat": 44.5950, "lon": 40.1000, "container_count": 4},
    {"code": "MKP-022", "name": "РљРџ СѓР». Р—Р°РІРѕРґСЃРєР°СЏ 33", "address": "СѓР». Р—Р°РІРѕРґСЃРєР°СЏ, 33, РњР°Р№РєРѕРї", "district": "Р®Р¶РЅС‹Р№", "lat": 44.5930, "lon": 40.0950, "container_count": 6},
    {"code": "MKP-023", "name": "РљРџ СѓР». РЎР°РґРѕРІР°СЏ 60", "address": "СѓР». РЎР°РґРѕРІР°СЏ, 60, РњР°Р№РєРѕРї", "district": "Р®Р¶РЅС‹Р№", "lat": 44.5965, "lon": 40.1050, "container_count": 3},
    {"code": "MKP-024", "name": "РљРџ СѓР». РЁРєРѕР»СЊРЅР°СЏ 14", "address": "СѓР». РЁРєРѕР»СЊРЅР°СЏ, 14, РњР°Р№РєРѕРї", "district": "Р®Р¶РЅС‹Р№", "lat": 44.5940, "lon": 40.1100, "container_count": 4},
    {"code": "MKP-025", "name": "РљРџ СѓР». РџРѕР±РµРґС‹ 100", "address": "СѓР». РџРѕР±РµРґС‹, 100, РњР°Р№РєРѕРї", "district": "Р®Р¶РЅС‹Р№", "lat": 44.5980, "lon": 40.0980, "container_count": 5},
    {"code": "MKP-026", "name": "РљРџ СѓР». РљРёСЂРѕРІР° 48", "address": "СѓР». РљРёСЂРѕРІР°, 48, РњР°Р№РєРѕРї", "district": "Р¦РµРЅС‚СЂР°Р»СЊРЅС‹Р№", "lat": 44.6088, "lon": 40.1005, "container_count": 4},
    {"code": "MKP-027", "name": "РљРџ СѓР». РќРµРєСЂР°СЃРѕРІР° 72", "address": "СѓР». РќРµРєСЂР°СЃРѕРІР°, 72, РњР°Р№РєРѕРї", "district": "Р—Р°РїР°РґРЅС‹Р№", "lat": 44.6165, "lon": 40.0850, "container_count": 3},
    {"code": "MKP-028", "name": "РљРџ СѓР». РњРёСЂР° 115", "address": "СѓР». РњРёСЂР°, 115, РњР°Р№РєРѕРї", "district": "Р’РѕСЃС‚РѕС‡РЅС‹Р№", "lat": 44.6010, "lon": 40.1220, "container_count": 5},
    {"code": "MKP-029", "name": "РљРџ СѓР». РЎС‚СЂРѕРёС‚РµР»РµР№ 40", "address": "СѓР». РЎС‚СЂРѕРёС‚РµР»РµР№, 40, РњР°Р№РєРѕРї", "district": "РЎРµРІРµСЂРЅС‹Р№", "lat": 44.6240, "lon": 40.0980, "container_count": 4},
    {"code": "MKP-030", "name": "РљРџ СѓР». РњРѕР»РѕРґС‘Р¶РЅР°СЏ 20", "address": "СѓР». РњРѕР»РѕРґС‘Р¶РЅР°СЏ, 20, РњР°Р№РєРѕРї", "district": "Р®Р¶РЅС‹Р№", "lat": 44.5955, "lon": 40.1070, "container_count": 3},
]

PLATFORM_SETTINGS = [
    {"key": "dashboard_refresh_interval", "value": "30", "value_type": "int", "description": "РРЅС‚РµСЂРІР°Р» Р°РІС‚РѕРѕР±РЅРѕРІР»РµРЅРёСЏ dashboard (СЃРµРєСѓРЅРґС‹)"},
    {"key": "fill_level_warning_threshold", "value": "55", "value_type": "int", "description": "РџРѕСЂРѕРі Р·Р°РїРѕР»РЅРµРЅРЅРѕСЃС‚Рё РґР»СЏ СЃС‚Р°С‚СѓСЃР° 'РІРЅРёРјР°РЅРёРµ' (%)"},
    {"key": "fill_level_critical_threshold", "value": "85", "value_type": "int", "description": "РџРѕСЂРѕРі Р·Р°РїРѕР»РЅРµРЅРЅРѕСЃС‚Рё РґР»СЏ СЃС‚Р°С‚СѓСЃР° 'РєСЂРёС‚РёС‡РЅРѕ' (%)"},
    {"key": "alert_overflow_threshold", "value": "90", "value_type": "int", "description": "РџРѕСЂРѕРі РіРµРЅРµСЂР°С†РёРё alert РїРµСЂРµРїРѕР»РЅРµРЅРёСЏ (%)"},
    {"key": "low_confidence_threshold", "value": "0.6", "value_type": "float", "description": "РџРѕСЂРѕРі РЅРёР·РєРѕР№ СѓРІРµСЂРµРЅРЅРѕСЃС‚Рё AI"},
    {"key": "no_data_timeout_minutes", "value": "120", "value_type": "int", "description": "РўР°Р№Рј-Р°СѓС‚ 'РЅРµС‚ СЃРІРµР¶РёС… РґР°РЅРЅС‹С…' (РјРёРЅСѓС‚С‹)"},
    {"key": "map_default_lat", "value": "44.6078", "value_type": "float", "description": "РЁРёСЂРѕС‚Р° С†РµРЅС‚СЂР° РєР°СЂС‚С‹ РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ"},
    {"key": "map_default_lon", "value": "40.1058", "value_type": "float", "description": "Р”РѕР»РіРѕС‚Р° С†РµРЅС‚СЂР° РєР°СЂС‚С‹ РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ"},
    {"key": "map_default_zoom", "value": "13", "value_type": "int", "description": "РњР°СЃС€С‚Р°Р± РєР°СЂС‚С‹ РїРѕ СѓРјРѕР»С‡Р°РЅРёСЋ"},
    {"key": "notifications_enabled", "value": "true", "value_type": "bool", "description": "РЈРІРµРґРѕРјР»РµРЅРёСЏ РІРєР»СЋС‡РµРЅС‹"},
    {"key": "demo_mode", "value": "true", "value_type": "bool", "description": "Р”РµРјРѕ-СЂРµР¶РёРј РїР»Р°С‚С„РѕСЂРјС‹"},
]

ALERT_TYPES = ["overflow", "litter", "degradation", "camera_offline", "no_data", "ai_error"]
ALERT_SEVERITIES = ["low", "medium", "high", "critical"]
ALERT_STATUSES = ["new", "viewed", "confirmed", "closed", "false_positive"]
ALERT_MESSAGES = {
    "overflow": "РћР±РЅР°СЂСѓР¶РµРЅРѕ РїРµСЂРµРїРѕР»РЅРµРЅРёРµ РєРѕРЅС‚РµР№РЅРµСЂРѕРІ",
    "litter": "РћР±РЅР°СЂСѓР¶РµРЅ РјСѓСЃРѕСЂ РІРЅРµ РєРѕРЅС‚РµР№РЅРµСЂРѕРІ",
    "degradation": "Р—Р°С„РёРєСЃРёСЂРѕРІР°РЅРѕ СѓС…СѓРґС€РµРЅРёРµ СЃРѕСЃС‚РѕСЏРЅРёСЏ РїР»РѕС‰Р°РґРєРё",
    "camera_offline": "РљР°РјРµСЂР° РЅРµ РѕС‚РІРµС‡Р°РµС‚",
    "no_data": "РќРµС‚ СЃРІРµР¶РёС… РґР°РЅРЅС‹С… СЃ РїР»РѕС‰Р°РґРєРё",
    "ai_error": "РћС€РёР±РєР° AI-РѕР±СЂР°Р±РѕС‚РєРё РёР·РѕР±СЂР°Р¶РµРЅРёСЏ",
}


def _random_status_and_fill():
    r = random.random()
    if r < 0.45:
        fill = round(random.uniform(10, WARNING_FILL_LEVEL - 0.1), 1)
        return status_from_fill_level(fill), fill
    elif r < 0.70:
        fill = round(random.uniform(WARNING_FILL_LEVEL, CRITICAL_FILL_LEVEL - 0.1), 1)
        return status_from_fill_level(fill), fill
    elif r < 0.85:
        fill = round(random.uniform(CRITICAL_FILL_LEVEL, 98), 1)
        return status_from_fill_level(fill), fill
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
                code=f"CAM-{i:03d}", name=f"РљР°РјРµСЂР° {i:03d}",
                source_url=f"rtsp://cam{i}.zarya.local/stream",
                status=cam_status, polling_interval_sec=300,
                last_seen_at=last_seen,
                error_count=0 if cam_status == "online" else random.randint(1, 25),
                site_id=i,
            )
            db.add(cam)
            cameras.append(cam)
        for i in range(31, 33):
            cam = Camera(
                code=f"CAM-{i:03d}",
                name=f"Камера {i:03d}",
                source_url=f"rtsp://cam{i}.zarya.local/stream",
                status="maintenance",
                polling_interval_sec=300,
                last_seen_at=now - timedelta(hours=random.randint(1, 12)),
                error_count=0,
                site_id=None,
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

        # Observations вЂ” ~8 per site over last 48h
        obs_count = 0
        for site in sites:
            for j in range(8):
                hours_ago = random.uniform(1, 48)
                captured = now - timedelta(hours=hours_ago)
                o_fill = max(0, min(100, site.fill_level + random.uniform(-15, 15)))
                o_status = status_from_fill_level(o_fill)
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

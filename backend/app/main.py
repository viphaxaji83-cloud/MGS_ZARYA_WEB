import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .core.config import settings
from .api.endpoints import auth, dashboard, sites, cameras, alerts, reports, health
from .api.endpoints.ws import router as ws_router, live_simulator
from .api.admin import users as admin_users, cameras as admin_cameras, sites as admin_sites, settings as admin_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(live_simulator())
    yield
    task.cancel()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(sites.router, prefix=settings.API_PREFIX)
app.include_router(cameras.router, prefix=settings.API_PREFIX)
app.include_router(alerts.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)
app.include_router(health.router, prefix=settings.API_PREFIX)

# Admin routes
app.include_router(admin_users.router, prefix=settings.API_PREFIX)
app.include_router(admin_cameras.router, prefix=settings.API_PREFIX)
app.include_router(admin_sites.router, prefix=settings.API_PREFIX)
app.include_router(admin_settings.router, prefix=settings.API_PREFIX)

# WebSocket
app.include_router(ws_router)

# Static files for mock images
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

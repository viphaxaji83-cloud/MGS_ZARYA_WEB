from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from ..core.database import Base


class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    source_url = Column(String(500), nullable=True)
    status = Column(String(30), default="online")  # online, offline, error, maintenance
    polling_interval_sec = Column(Integer, default=300)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    error_count = Column(Integer, default=0)
    site_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, func
from ..core.database import Base


class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=False)
    district = Column(String(100), nullable=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    type = Column(String(50), default="standard")
    container_count = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="normal")  # normal, warning, critical, no_data, offline
    fill_level = Column(Float, default=0.0)
    ai_confidence = Column(Float, default=0.0)
    has_overflow = Column(Boolean, default=False)
    has_litter_outside = Column(Boolean, default=False)
    camera_id = Column(Integer, nullable=True)
    last_capture_at = Column(DateTime(timezone=True), nullable=True)
    last_image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

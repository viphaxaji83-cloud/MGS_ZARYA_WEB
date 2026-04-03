from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, func
from ..core.database import Base


class Observation(Base):
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, nullable=False, index=True)
    camera_id = Column(Integer, nullable=True)
    image_url = Column(String(500), nullable=True)
    captured_at = Column(DateTime(timezone=True), nullable=False)
    fill_level = Column(Float, default=0.0)
    status = Column(String(30), default="normal")
    ai_confidence = Column(Float, default=0.0)
    has_overflow = Column(Boolean, default=False)
    has_litter_outside = Column(Boolean, default=False)
    has_anomaly = Column(Boolean, default=False)
    raw_meta_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

from sqlalchemy import Column, Integer, String, DateTime, Text, func
from ..core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, nullable=False, index=True)
    type = Column(String(50), nullable=False)  # overflow, litter, degradation, camera_offline, no_data, ai_error
    severity = Column(String(20), default="medium")  # low, medium, high, critical
    status = Column(String(20), default="new")  # new, confirmed, false_positive
    message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    acknowledged_by = Column(Integer, nullable=True)

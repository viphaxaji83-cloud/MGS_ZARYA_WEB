from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_sites: int
    sites_normal: int
    sites_warning: int
    sites_critical: int
    sites_no_data: int
    sites_offline: int
    cameras_online: int
    cameras_offline: int
    active_alerts: int
    avg_fill_level: float

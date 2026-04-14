export interface User {
  id: number;
  name: string;
  email: string;
  login: string;
  role: 'admin' | 'operator';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Site {
  id: number;
  code: string;
  name: string;
  address: string;
  district: string | null;
  lat: number;
  lon: number;
  type: string;
  container_count: number;
  description: string | null;
  status: SiteStatus;
  fill_level: number;
  ai_confidence: number;
  has_overflow: boolean;
  has_litter_outside: boolean;
  camera_id: number | null;
  last_capture_at: string | null;
  last_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SiteStatus = 'normal' | 'warning' | 'critical' | 'no_data' | 'offline';

export interface Camera {
  id: number;
  code: string;
  name: string;
  source_url: string | null;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  polling_interval_sec: number;
  last_seen_at: string | null;
  error_count: number;
  site_id: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Observation {
  id: number;
  site_id: number;
  camera_id: number | null;
  image_url: string | null;
  captured_at: string;
  fill_level: number;
  status: string;
  ai_confidence: number;
  has_overflow: boolean;
  has_litter_outside: boolean;
  has_anomaly: boolean;
}

export interface Alert {
  id: number;
  site_id: number;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  acknowledged_by: number | null;
}

export type AlertType = 'overflow' | 'litter' | 'degradation' | 'camera_offline' | 'no_data' | 'ai_error';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'new' | 'confirmed' | 'false_positive';

export interface DashboardSummary {
  total_sites: number;
  sites_normal: number;
  sites_warning: number;
  sites_critical: number;
  sites_no_data: number;
  sites_offline: number;
  cameras_online: number;
  cameras_offline: number;
  active_alerts: number;
  avg_fill_level: number;
}

export interface PlatformSetting {
  id: number;
  key: string;
  value: string | null;
  value_type: string;
  description: string | null;
  updated_at: string;
}

export interface AuditLogEntry {
  id: number;
  actor_user_id: number;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: number | null;
  payload_json: string | null;
  created_at: string;
}

export interface SystemStatus {
  backend_status: string;
  database_status: string;
  storage_status: string;
  live_updates_status: string;
  active_cameras: number;
  offline_cameras: number;
  sites_without_data: number;
  active_alerts: number;
  last_system_update: string | null;
}

export interface ReportSummary {
  period_days: number;
  total_alerts: number;
  critical_alerts: number;
  total_observations: number;
  total_sites: number;
  cameras_offline: number;
  daily_alerts: { date: string; count: number }[];
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  user_id: number;
  name: string;
}

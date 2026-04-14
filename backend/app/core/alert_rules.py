ALERT_TYPE_SEVERITY: dict[str, str] = {
    "overflow": "critical",
    "litter": "medium",
    "degradation": "high",
    "camera_offline": "high",
    "no_data": "medium",
    "ai_error": "medium",
}


def severity_for_alert_type(alert_type: str) -> str:
    return ALERT_TYPE_SEVERITY.get(alert_type, "medium")

WARNING_FILL_LEVEL = 55.0
CRITICAL_FILL_LEVEL = 85.0


def status_from_fill_level(fill_level: float) -> str:
    if fill_level < WARNING_FILL_LEVEL:
        return "normal"
    if fill_level < CRITICAL_FILL_LEVEL:
        return "warning"
    return "critical"

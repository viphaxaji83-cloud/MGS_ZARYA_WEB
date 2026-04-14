import re
from typing import Any

import httpx

GEOCODER_URL = "https://nominatim.openstreetmap.org/search"
GEOCODER_HEADERS = {
    "User-Agent": "ZaryaPlatform/1.0",
    "Accept-Language": "ru",
}
GEOCODER_BASE_PARAMS = {
    "format": "jsonv2",
    "limit": 1,
    "countrycodes": "ru",
    "addressdetails": 1,
}
MAYKOP_CITY = "Майкоп"
MAYKOP_REGION = "Республика Адыгея"
RUSSIA_COUNTRY = "Россия"
MAYKOP_VIEWBOX = "40.0400,44.6600,40.1800,44.5600"


def _normalize_address(address: str) -> str:
    return re.sub(r"\s+", " ", address).strip(" ,")


def _extract_street_query(address: str) -> str:
    normalized = _normalize_address(address)
    return re.sub(r",\s*Майкоп\s*$", "", normalized, flags=re.IGNORECASE).strip(" ,")


def _strip_house_number(street_query: str) -> str:
    return re.sub(r",?\s*\d+[\w/-]*\s*$", "", street_query).strip(" ,")


def _build_geocode_attempts(address: str) -> list[dict[str, Any]]:
    street_query = _extract_street_query(address)
    street_only = _strip_house_number(street_query)
    attempts: list[dict[str, Any]] = [
        {
            "street": street_query,
            "city": MAYKOP_CITY,
            "state": MAYKOP_REGION,
            "country": RUSSIA_COUNTRY,
            "viewbox": MAYKOP_VIEWBOX,
            "bounded": 1,
        },
        {
            "q": f"{street_query}, {MAYKOP_CITY}, {MAYKOP_REGION}, {RUSSIA_COUNTRY}",
            "viewbox": MAYKOP_VIEWBOX,
            "bounded": 1,
        },
    ]

    if street_only and street_only != street_query:
        attempts.extend(
            [
                {
                    "street": street_only,
                    "city": MAYKOP_CITY,
                    "state": MAYKOP_REGION,
                    "country": RUSSIA_COUNTRY,
                    "viewbox": MAYKOP_VIEWBOX,
                    "bounded": 1,
                },
                {
                    "q": f"{street_only}, {MAYKOP_CITY}, {MAYKOP_REGION}, {RUSSIA_COUNTRY}",
                    "viewbox": MAYKOP_VIEWBOX,
                    "bounded": 1,
                },
            ]
        )

    attempts.append({"q": f"{street_query}, {MAYKOP_CITY}, {RUSSIA_COUNTRY}"})
    return attempts


async def geocode_site_address(address: str) -> dict[str, float | str | None]:
    query = _normalize_address(address)
    if not query:
        raise ValueError("Address is required")

    async with httpx.AsyncClient(timeout=15.0, headers=GEOCODER_HEADERS, follow_redirects=True) as client:
        for params in _build_geocode_attempts(query):
            response = await client.get(GEOCODER_URL, params={**GEOCODER_BASE_PARAMS, **params})
            response.raise_for_status()
            data = response.json()
            if not data:
                continue

            item = data[0]
            return {
                "lat": round(float(item["lat"]), 6),
                "lon": round(float(item["lon"]), 6),
                "query": params.get("q", params.get("street", query)),
                "resolved_address": item.get("display_name"),
            }

    raise LookupError("Coordinates not found for this address")

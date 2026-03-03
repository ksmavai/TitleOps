# Datadog API client — submits custom metrics and queries them back for live telemetry

import os
import time
import random
import httpx

DATADOG_API_KEY = os.getenv("DATADOG_API_KEY", "")
DATADOG_APP_KEY = os.getenv("DATADOG_APP_KEY", "")
DATADOG_SITE = os.getenv("DATADOG_SITE", "us5.datadoghq.com")
DATADOG_BASE_URL = f"https://api.{DATADOG_SITE}/api"

# Cache availability check
_dd_available: bool | None = None
_dd_last_check: float = 0


async def _check_dd_availability() -> bool:
    """Validate the Datadog API key. Caches result for 5 minutes."""
    global _dd_available, _dd_last_check

    if _dd_available is not None and (time.time() - _dd_last_check) < 300:
        return _dd_available

    if not DATADOG_API_KEY:
        _dd_available = False
        _dd_last_check = time.time()
        return False

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(
                f"{DATADOG_BASE_URL}/v1/validate",
                headers={"DD-API-KEY": DATADOG_API_KEY},
            )
            _dd_available = res.status_code == 200
    except Exception:
        _dd_available = False

    _dd_last_check = time.time()
    return _dd_available


# ── Submit Metrics ──

async def submit_metric(metric_name: str, value: float, tags: list[str] | None = None) -> dict:
    """Submit a single metric data point to Datadog."""
    if not await _check_dd_availability():
        return {"status": "unavailable"}

    try:
        now = int(time.time())
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{DATADOG_BASE_URL}/v1/series",
                headers={
                    "DD-API-KEY": DATADOG_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "series": [
                        {
                            "metric": metric_name,
                            "type": "gauge",
                            "points": [[now, value]],
                            "host": "titleops-demo",
                            "tags": tags or ["env:demo", "app:titleops"],
                        }
                    ]
                },
            )
            res.raise_for_status()
            return {"status": "submitted", "metric": metric_name, "value": value}
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def submit_app_metrics(latency: float, error_rate: float, cpu: float) -> dict:
    """Submit all TitleOps application metrics to Datadog in one call."""
    if not await _check_dd_availability():
        return {"status": "unavailable"}

    try:
        now = int(time.time())
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{DATADOG_BASE_URL}/v1/series",
                headers={
                    "DD-API-KEY": DATADOG_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "series": [
                        {
                            "metric": "titleops.latency",
                            "type": "gauge",
                            "points": [[now, latency]],
                            "host": "titleops-demo",
                            "tags": ["env:demo", "app:titleops", "service:api"],
                        },
                        {
                            "metric": "titleops.error_rate",
                            "type": "gauge",
                            "points": [[now, error_rate * 100]],  # percent
                            "host": "titleops-demo",
                            "tags": ["env:demo", "app:titleops", "service:api"],
                        },
                        {
                            "metric": "titleops.cpu",
                            "type": "gauge",
                            "points": [[now, cpu]],
                            "host": "titleops-demo",
                            "tags": ["env:demo", "app:titleops", "service:api"],
                        },
                    ]
                },
            )
            res.raise_for_status()
            return {"status": "submitted"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def seed_historical_metrics(is_incident: bool = False) -> dict:
    """Seed the last 30 minutes of historical metrics to Datadog.
    This ensures the chart has data immediately instead of waiting.
    """
    if not await _check_dd_availability():
        return {"status": "unavailable"}

    try:
        now = int(time.time())
        latency_points = []
        error_points = []
        cpu_points = []

        for i in range(30):
            t = now - (29 - i) * 60  # 1-minute intervals over 30 min

            if is_incident and i >= 20:
                # Simulate spike in last 10 minutes
                spike_factor = min((i - 19) / 5.0, 1.0)
                lat = 30 + spike_factor * 4970  # ramp up to ~5000
                err = 0.1 + spike_factor * 22.9  # ramp up to ~23%
                cpu = 25 + spike_factor * 20  # ramp up to ~45%
            else:
                lat = random.uniform(25, 40)
                err = random.uniform(0.05, 0.15)
                cpu = random.uniform(20, 30)

            latency_points.append([t, round(lat, 1)])
            error_points.append([t, round(err, 2)])
            cpu_points.append([t, round(cpu, 1)])

        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{DATADOG_BASE_URL}/v1/series",
                headers={
                    "DD-API-KEY": DATADOG_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "series": [
                        {
                            "metric": "titleops.latency",
                            "type": "gauge",
                            "points": latency_points,
                            "host": "titleops-demo",
                            "tags": ["env:demo", "app:titleops", "service:api"],
                        },
                        {
                            "metric": "titleops.error_rate",
                            "type": "gauge",
                            "points": error_points,
                            "host": "titleops-demo",
                            "tags": ["env:demo", "app:titleops", "service:api"],
                        },
                        {
                            "metric": "titleops.cpu",
                            "type": "gauge",
                            "points": cpu_points,
                            "host": "titleops-demo",
                            "tags": ["env:demo", "app:titleops", "service:api"],
                        },
                    ]
                },
            )
            res.raise_for_status()
            return {"status": "seeded", "points": len(latency_points)}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ── Query Metrics ──

async def query_metrics(metric_name: str = "titleops.latency", period_seconds: int = 3600) -> dict:
    """Query metrics from Datadog."""
    if not await _check_dd_availability():
        return {"status": "unavailable"}

    try:
        now = int(time.time())
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                f"{DATADOG_BASE_URL}/v1/query",
                headers={
                    "DD-API-KEY": DATADOG_API_KEY,
                    "DD-APPLICATION-KEY": DATADOG_APP_KEY,
                },
                params={
                    "from": now - period_seconds,
                    "to": now,
                    "query": f"avg:{metric_name}{{*}}",
                },
            )
            res.raise_for_status()
            data = res.json()
            if data.get("series"):
                return {"status": "live", "data": data}
            return {"status": "empty"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ── Events ──

async def send_event(title: str, text: str, alert_type: str = "info", tags: list[str] | None = None) -> dict:
    """Submit an event to Datadog."""
    if not await _check_dd_availability():
        return {"status": "unavailable"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(
                f"{DATADOG_BASE_URL}/v1/events",
                headers={
                    "DD-API-KEY": DATADOG_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "title": title,
                    "text": text,
                    "alert_type": alert_type,
                    "tags": tags or ["env:demo", "app:titleops"],
                    "source_type_name": "titleops",
                },
            )
            res.raise_for_status()
            return {"status": "sent"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def get_service_status() -> dict:
    """Get Datadog connection status."""
    available = await _check_dd_availability()
    return {
        "connected": available,
        "api_key_configured": bool(DATADOG_API_KEY),
        "app_key_configured": bool(DATADOG_APP_KEY),
        "base_url": DATADOG_BASE_URL,
    }

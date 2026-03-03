"""
TitleOps Backend — FastAPI Entry Point
AI-powered AIOps agent: detect → diagnose → research → execute → document
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import time
import asyncio

load_dotenv()

from routers import analyze, research, execute, postmortem, chat, auto_triage
from services.simulator import simulator
from services.datadog import (
    send_event, query_metrics, get_service_status,
    submit_app_metrics, seed_historical_metrics,
)
from models.schemas import InjectFaultRequest, InjectFaultResponse, HealthResponse


# ── Background metric pusher ──

_metric_push_task = None


async def _push_metrics_loop():
    """Push current simulator metrics to Datadog every 30 seconds."""
    while True:
        try:
            h = simulator.get_health()
            m = h["metrics"]
            await submit_app_metrics(
                latency=m["latency_ms"],
                error_rate=m["error_rate"],
                cpu=m["cpu_percent"],
            )
        except Exception:
            pass
        await asyncio.sleep(30)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: seed Datadog (non-blocking), start background push loop."""
    global _metric_push_task

    async def _seed_datadog():
        """Seed in background so server starts immediately."""
        try:
            await seed_historical_metrics(is_incident=False)
        except Exception:
            pass  # Datadog might be slow/unavailable — don't block app

    # Fire and forget — don't block startup
    asyncio.create_task(_seed_datadog())
    # Start background metric pusher
    _metric_push_task = asyncio.create_task(_push_metrics_loop())
    yield
    # Shutdown
    if _metric_push_task:
        _metric_push_task.cancel()


app = FastAPI(
    title="TitleOps API",
    description="AI-powered AIOps backend — DeepSeek diagnosis + fix research + Datadog telemetry",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(analyze.router, prefix="/api", tags=["Analysis"])
app.include_router(research.router, prefix="/api", tags=["Research"])
app.include_router(execute.router, prefix="/api", tags=["Execution"])
app.include_router(postmortem.router, prefix="/api", tags=["Post-Mortem"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(auto_triage.router, prefix="/api", tags=["Agent Auto-Drive"])


# ── Inline routes ──

@app.get("/api/health", response_model=HealthResponse)
async def health():
    """Get current system health status and metrics."""
    return simulator.get_health()


@app.get("/api/telemetry")
async def telemetry():
    """Get telemetry time-series data — queries Datadog for real data.
    Falls back to simulator if Datadog has no data.
    """
    try:
        dd = await query_metrics("titleops.latency", period_seconds=3600)
        if dd.get("status") == "live" and dd.get("data", {}).get("series"):
            series = dd["data"]["series"][0]
            points = []
            for ts in series.get("pointlist", []):
                t = time.strftime("%H:%M", time.localtime(ts[0] / 1000))
                points.append({"time": t, "latency": round(ts[1], 1)})
            return {"source": "datadog", "data": points[-20:]}
    except Exception:
        pass

    # Fallback to simulator
    return {"source": "simulator", "data": simulator.get_telemetry_data()}


@app.post("/api/inject-fault", response_model=InjectFaultResponse)
async def inject_fault(request: InjectFaultRequest):
    """Inject a simulated fault scenario for demo purposes."""
    result = simulator.inject_fault(request.scenario)

    # Push incident metrics + event to Datadog
    sc = simulator.SCENARIOS.get(request.scenario, {})
    override = sc.get("metrics_override", {})
    await submit_app_metrics(
        latency=override.get("latency_ms", 5000),
        error_rate=override.get("error_rate", 0.23),
        cpu=override.get("cpu_percent", 45),
    )
    await seed_historical_metrics(is_incident=True)
    await send_event(
        title=f"[TitleOps] Incident: {sc.get('name', request.scenario)}",
        text=f"Fault injected — scenario: {request.scenario}\nAffected: {', '.join(sc.get('affected_services', []))}",
        alert_type="error",
        tags=["env:demo", "app:titleops", f"scenario:{request.scenario}"],
    )

    return InjectFaultResponse(**result)


@app.get("/api/datadog/status")
async def datadog_status():
    """Check Datadog API connection status."""
    return await get_service_status()


@app.get("/api/datadog/metrics")
async def datadog_metrics(metric: str = "titleops.latency"):
    """Query Datadog metrics."""
    return await query_metrics(metric)


@app.get("/")
async def root():
    return {"message": "TitleOps API is running", "docs": "/docs"}

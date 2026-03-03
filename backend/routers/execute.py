# Router: POST /api/execute — Approve & execute fixes with realistic delays

import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import ExecuteRequest, ExecuteResponse, ExecuteResult
from services.simulator import simulator
from services.datadog import submit_app_metrics, seed_historical_metrics, send_event
import json

router = APIRouter()


@router.post("/execute")
async def execute(request: ExecuteRequest):
    """Execute approved fixes with realistic per-fix delays.
    Uses partial fix logic — applying 1/3 fixes does NOT fully resolve the incident.
    """
    if not simulator.get_health()["incident_active"]:
        raise HTTPException(status_code=400, detail="No active incident to resolve.")

    applied_count = len(request.fix_ids)
    total_count = simulator.total_fixes_available

    async def stream_execution():
        results = []

        for i, fix_id in enumerate(request.fix_ids):
            cmd = request.commands[i] if request.commands and i < len(request.commands) else f"fix-{fix_id}"

            # Send progress event
            yield json.dumps({
                "type": "progress",
                "step": i + 1,
                "total": applied_count,
                "fix_id": fix_id,
                "command": cmd,
                "status": "running",
                "message": f"Applying fix {i + 1}/{applied_count}: {cmd[:80]}...",
            }) + "\n"

            # Realistic delay — 2-4 seconds per fix
            await asyncio.sleep(2.5 + (i * 0.5))

            # Track in simulator timeline
            simulator.add_timeline_event(f"Fix {i + 1} applied: {cmd[:60]}")

            # Gradually improve metrics with each fix
            progress = (i + 1) / total_count  # progress relative to TOTAL, not selected
            
            # Recalculate combined incident metrics
            incident_metrics = {"latency_ms": 32, "error_rate": 0.001, "cpu_percent": 24}
            for s in simulator.active_scenarios:
                sc_override = simulator.SCENARIOS.get(s, {}).get("metrics_override", {})
                incident_metrics["latency_ms"] = max(incident_metrics["latency_ms"], sc_override.get("latency_ms", 32))
                incident_metrics["error_rate"] = min(1.0, incident_metrics["error_rate"] + sc_override.get("error_rate", 0))
                incident_metrics["cpu_percent"] = min(100, incident_metrics["cpu_percent"] + sc_override.get("cpu_percent", 0))

            latency = incident_metrics.get("latency_ms", 5000) * (1 - progress) + 32 * progress
            error_rate = incident_metrics.get("error_rate", 0.23) * (1 - progress) + 0.001 * progress
            cpu = incident_metrics.get("cpu_percent", 45) * (1 - progress) + 24 * progress

            # Push recovering metrics to Datadog
            await submit_app_metrics(
                latency=round(latency, 1),
                error_rate=round(error_rate, 4),
                cpu=round(cpu, 1),
            )

            results.append(ExecuteResult(
                fix_id=fix_id,
                command=cmd,
                status="success",
                output=f"Fix applied. Latency: {latency:.0f}ms",
            ))

            yield json.dumps({
                "type": "progress",
                "step": i + 1,
                "total": applied_count,
                "fix_id": fix_id,
                "command": cmd,
                "status": "complete",
                "message": f"Fix {i + 1}/{applied_count} applied successfully",
            }) + "\n"

        # Evaluate execution using DeepSeek AI
        yield json.dumps({
            "type": "progress",
            "step": applied_count + 1,
            "total": applied_count + 1,
            "status": "running",
            "message": "AI is evaluating execution results against root cause...",
        }) + "\n"

        from services.deepseek import evaluate_fixes
        eval_result = await evaluate_fixes(request.root_cause, request.commands or [])

        reasoning = eval_result.get("reasoning", "Evaluated fixes.")
        resolution_type = eval_result.get("resolution", "partial")
        ratio = float(eval_result.get("ratio", 0.0))

        yield json.dumps({
            "type": "progress",
            "step": applied_count + 1,
            "total": applied_count + 1,
            "status": "complete",
            "message": f"AI Evaluation: {reasoning}",
        }) + "\n"

        # Apply AI's evaluated ratio to the simulator
        effective_count = int(ratio * simulator.total_fixes_available)
        if resolution_type == "full":
            effective_count = simulator.total_fixes_available

        resolution = simulator.apply_partial_fix(effective_count, simulator.total_fixes_available)
        
        if resolution_type == "full":
            resolution["resolution"] = "full"
            resolution["message"] = f"AI Evaluation: {reasoning} System fully recovered."
            resolution["new_state"] = "healthy"
        else:
            resolution["resolution"] = "partial"
            resolution["message"] = f"System improved but still degraded. AI Notes: {reasoning} (Actual fixes submitted: {applied_count}/{total_count})"
        
        # Override the simulator response legacy message with our new AI-infused string
        if resolution["resolution"] == "full":
            # Full resolution — push healthy metrics and event to Datadog
            await submit_app_metrics(latency=32, error_rate=0.001, cpu=24)
            await seed_historical_metrics(is_incident=False)
            await send_event(
                title="[TitleOps] Incident Resolved",
                text=f"All {applied_count} fixes applied successfully. System recovered.",
                alert_type="success",
                tags=["env:demo", "app:titleops", "resolved"],
            )

        # Send final result
        yield json.dumps({
            "type": "result",
            "success": True,
            "resolution": resolution["resolution"],
            "message": resolution["message"],
            "results": [r.model_dump() for r in results],
            "new_health_status": resolution.get("new_state", "degraded"),
            "remaining_fixes": resolution.get("remaining_fixes", 0),
        }) + "\n"

    return StreamingResponse(
        stream_execution(),
        media_type="application/x-ndjson",
    )

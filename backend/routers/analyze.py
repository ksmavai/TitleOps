# Router: POST /api/analyze — DeepSeek root-cause analysis

from fastapi import APIRouter, HTTPException
from models.schemas import AnalyzeRequest, AnalyzeResponse
from services.deepseek import analyze_logs
from services.simulator import simulator

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """Analyze raw logs using DeepSeek to produce a root-cause diagnosis."""
    try:
        raw_logs = request.raw_logs

        # If no logs provided but incident is active, use the logs from fault injection
        if not raw_logs and request.scenario_id:
            health = simulator.get_health()
            if health["incident_active"] and health["active_scenarios"]:
                # Re-inject generates logs with real timestamps,
                # but we already have the logs from inject_fault stored in the request
                # Just generate fresh logs from template with current time
                from datetime import datetime, timezone, timedelta
                now = datetime.now(timezone(timedelta(hours=-5)))
                timestamps = {}
                for i in range(6):
                    ts = now + timedelta(seconds=i)
                    timestamps[f"ts{i}"] = ts.strftime("%Y-%m-%dT%H:%M:%SZ")
                
                raw_logs_parts = []
                for s in health["active_scenarios"]:
                    sc = simulator.SCENARIOS[s]
                    raw_logs_parts.append(sc["log_template"].format(**timestamps))
                raw_logs = "\n\n".join(raw_logs_parts)

        if not raw_logs:
            raise HTTPException(status_code=400, detail="No logs to analyze. Inject a fault first.")

        # Add timeline event
        simulator.add_timeline_event("Root cause analysis initiated via DeepSeek AI")

        result = await analyze_logs(raw_logs)

        simulator.add_timeline_event(
            f"Analysis complete — severity: {result.get('severity', 'unknown')}, "
            f"root cause: {result.get('root_cause', 'unknown')[:60]}"
        )

        return AnalyzeResponse(**result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

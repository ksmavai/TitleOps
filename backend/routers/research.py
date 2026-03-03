# Router: POST /api/research-fix — DeepSeek fix search

from fastapi import APIRouter, HTTPException
from models.schemas import ResearchRequest, ResearchResponse
from services.perplexity import research_fix
from services.simulator import simulator

router = APIRouter()


@router.post("/research-fix", response_model=ResearchResponse)
async def research(request: ResearchRequest):
    """Search for verified fixes using DeepSeek API."""
    try:
        result = await research_fix(request.root_cause, request.summary)

        # Tell the simulator how many fixes are available
        fixes = result.get("fixes", [])
        simulator.total_fixes_available = len(fixes) if fixes else 3
        simulator.add_timeline_event(f"Research complete — {len(fixes)} fixes identified")

        return ResearchResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research failed: {str(e)}")

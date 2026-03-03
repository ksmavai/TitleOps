# Router: POST /api/generate-postmortem — Auto post-mortem generation

from fastapi import APIRouter, HTTPException
from models.schemas import PostMortemRequest, PostMortemResponse
from services.deepseek import generate_postmortem
from services.simulator import simulator

router = APIRouter()


@router.post("/generate-postmortem", response_model=PostMortemResponse)
async def gen_postmortem(request: PostMortemRequest):
    """Generate an incident post-mortem report using DeepSeek with real timeline data."""
    try:
        print("[POSTMORTEM] Received request for post-mortem generation")
        analysis = request.analysis.model_dump()
        fixes = [f.model_dump() for f in request.fixes_applied]
        print(f"[POSTMORTEM] Parsed {len(fixes)} fixes")

        # Pass the real timeline from the simulator
        timeline = simulator.get_timeline()
        print(f"[POSTMORTEM] Fetched {len(timeline)} timeline events")

        print("[POSTMORTEM] Calling DeepSeek API...")
        result = await generate_postmortem(analysis, fixes, timeline)
        print(f"[POSTMORTEM] DeepSeek returned: {result.keys() if isinstance(result, dict) else type(result)}")
        
        return PostMortemResponse(**result)

    except Exception as e:
        print(f"[POSTMORTEM ERROR] Generation failed: {repr(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Post-mortem generation failed: {str(e)}")

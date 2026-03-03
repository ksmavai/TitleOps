# Router: POST /api/auto-triage — DeepSeek File Analysis for Agent Studio

from fastapi import APIRouter, HTTPException
from models.schemas import AutoTriageRequest, AutoTriageResponse
from services.deepseek import DEEPSEEK_BASE_URL, DEEPSEEK_API_KEY
import httpx
import json

router = APIRouter()

@router.post("/auto-triage", response_model=AutoTriageResponse)
async def auto_triage(request: AutoTriageRequest):
    """
    Takes raw file content dropped in the Agent Studio.
    Uses DeepSeek to extract Priority, Component, Title, and Description 
    to autonomously fill out the ServiceNow mock form.
    """
    system_prompt = """You are an autonomous AIOps agent.
You have intercepted a file dropped by an engineer (log, email, or advisory).
Your job is to read it, identify the issue, and extract structured data to fill out a ServiceNow Incident ticket.

You MUST respond with valid JSON in exactly this format:
{
  "priority": "1" or "2" or "3" or "4",
  "component": "auth-service" or "gateway" or "rpa-worker" or "salesforce-sync" (pick the closest match or default to gateway),
  "title": "A short, descriptive title of the incident",
  "description": "A detailed post-mortem style description of the issue, root cause, and recommended action based on the file content. Include a small snippet of the most relevant log/text if applicable."
}

Rules:
Priority scale: 1=Critical (outage), 2=High (degraded), 3=Moderate (bug), 4=Low (info)
Respond ONLY with the JSON object, no markdown fences or extra text."""

    user_message = f"File Name: {request.file_name}\n\nFile Content:\n{request.file_content}"

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                f"{DEEPSEEK_BASE_URL}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.2, # Low temp for structured data extraction
                    "max_tokens": 1024,
                },
            )
            response.raise_for_status()
            data = response.json()

        content = data["choices"][0]["message"]["content"].strip()

        # Strip markdown fences if DeepSeek hallucinates them
        if content.startswith("```"):
            content = content.split("\n", 1)[1]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        parsed_data = json.loads(content)
        
        return AutoTriageResponse(
            priority=str(parsed_data.get("priority", "3")),
            component=parsed_data.get("component", "gateway"),
            title=parsed_data.get("title", "Incident Triage"),
            description=parsed_data.get("description", "No detailed description extracted.")
        )

    except Exception as e:
        print(f"DeepSeek auto-triage failed or timed out: {str(e)}")
        # Graceful fallback for the demo so the Ghost Cursor doesn't hang
        return AutoTriageResponse(
            priority="1",
            component="gateway",
            title="Critical: API Gateway Outage",
            description=f"Automated Triage via TitleOps Agent:\n\nSource File: {request.file_name}\nRoot Cause: Simulated or fallback diagnosis due to LLM provider timeout.\nRecommended Action: Rotate API keys and restart the gateway pods."
        )

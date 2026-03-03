"""
Chat router — contextual AI assistant powered by DeepSeek.
Accepts the user's message + current page context, returns an AI response.
"""

import os
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from services.simulator import simulator

router = APIRouter()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"

# ── Page context descriptions ──
PAGE_CONTEXT = {
    "/": """The user is on the **Dashboard** page. It shows:
- **Top-left**: Live Datadog Telemetry chart — a real-time latency graph pulling data from Datadog's API, refreshing every 10 seconds. Shows latency (ms) over time.
- **Bottom-left**: System Health Overview — four metric gauges: Critical Incidents count, Latency (ms), Error Rate (%), and CPU Usage (%).
- **Below that**: Post-Mortem Drafts area — shows previously generated AI post-mortem reports.
- **Top-right**: Error Analysis card — shows DeepSeek's root cause analysis when an incident is active (severity, summary, root cause, affected services, confidence score, evidence).
- **Middle-right**: Verified Fixes card — shows AI-recommended fixes with their commands, sources (external docs or internal runbooks), and selection checkboxes.
- **Bottom-right**: Actions panel — when idle, shows a button to navigate to Simulations. During an incident, shows fix selection and execution controls.""",

    "/simulations": """The user is on the **Simulations** page (aka Chaos Simulations). It shows:
- **Redis Connection Timeout** — Simulates connection pool exhaustion on auth-redis-primary. Affects auth-service and id-verification-api. Causes auth failures, session timeouts, 5000ms+ latency.
- **API Latency Spike** — Simulates upstream Interac API degradation. Affects id-verification-api and gateway. Causes API timeouts, SLA breach, p99 latency 8400ms.
- **Document Processing Backlog** — Simulates worker pool exhaustion in doc-processor. Affects doc-processor and title-search-service. Causes queue backlog 890+, OOM kills, 45min search delays.
Users can select one or more scenarios and click "Launch Simulation" to inject faults simultaneously.""",

    "/post-mortem": """The user is on the **Post-Mortem Drafts** page. It shows previously generated AI post-mortem reports from resolved incidents. Each post-mortem includes a timeline, root cause analysis, impact assessment, remediation steps taken, and prevention recommendations.""",

    "/integrations": """The user is on the **Integrations** page. It shows connected services:
- Datadog (Connected) — Application monitoring and analytics
- PagerDuty (Connected) — Incident management and alerting
- Slack (Connected) — Team communication and notifications
- GitHub (Not Connected) — Source control and deployments
- Jira (Not Connected) — Issue tracking and project management""",

    "/settings": """The user is on the **Settings** page showing configuration options for the TitleOps platform.""",
}


class ChatRequest(BaseModel):
    message: str
    page: str = "/"
    history: list[dict] = []


class ChatResponse(BaseModel):
    reply: str


SYSTEM_PROMPT = """You are the TitleOps AI Assistant — an intelligent copilot built into the TitleOps AIOps Command Center.

TitleOps is an AI-powered incident response platform for a title and document processing company. It monitors production systems via Datadog, detects anomalies, analyzes root causes using DeepSeek AI, researches fixes using AI search, executes remediation, and generates post-mortem reports — all through an automated pipeline.

Key architecture:
- Backend: FastAPI (Python) with DeepSeek for analysis/chat, Datadog for live telemetry
- Frontend: React + TypeScript + Framer Motion with a skeuomorphic design system
- Pipeline flow: Fault Injection → Log Analysis → Fix Research → Fix Execution → Post-Mortem Generation

Your role:
1. Answer questions about what the user sees on screen and explain each component
2. Explain how the AIOps pipeline works
3. Help the user understand incidents, telemetry data, and AI analysis results
4. Provide guidance on which simulations to run and what fixes to apply
5. Be concise, technical, and helpful — like a senior SRE pair-programming with them

Do NOT use markdown headers (##). Use **bold** for emphasis and bullet points for lists. Keep responses EXTREMELY concise and punchy — maximum 1-2 short paragraphs. Get straight to the point."""


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """Contextual AI chat with page awareness."""

    # Build context about current page
    page_ctx = PAGE_CONTEXT.get(req.page, PAGE_CONTEXT["/"])

    # Add live system state
    health = simulator.get_health()
    state_ctx = f"""
Current system state:
- Status: {health['status']}
- Incident active: {health['incident_active']}
- Active scenarios: {', '.join(health.get('active_scenarios', [])) or 'None'}
- Latency: {health['metrics']['latency_ms']}ms
- Error rate: {health['metrics']['error_rate']}
- CPU: {health['metrics']['cpu_percent']}%
- Active connections: {health['metrics']['active_connections']}
- Queue depth: {health['metrics']['queue_depth']}"""

    system_msg = f"""{SYSTEM_PROMPT}

--- CURRENT PAGE CONTEXT ---
{page_ctx}

--- LIVE SYSTEM STATE ---
{state_ctx}
"""

    # Build message history for DeepSeek
    messages = [{"role": "system", "content": system_msg}]

    # Add conversation history (last 10 messages max)
    for msg in req.history[-10:]:
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", ""),
        })

    # Add current message
    messages.append({"role": "user", "content": req.message})

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{DEEPSEEK_BASE_URL}/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "max_tokens": 800,
                    "temperature": 0.7,
                },
            )
            response.raise_for_status()
            data = response.json()

        reply = data["choices"][0]["message"]["content"].strip()
        if not reply:
            reply = "I couldn't generate a response. Please try again."
    except Exception as e:
        reply = f"Sorry, I encountered an error connecting to the AI service. Please try again in a moment."

    return ChatResponse(reply=reply)

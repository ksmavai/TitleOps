# Pydantic models for all API request/response contracts

from pydantic import BaseModel
from typing import Optional


# ── Simulator ──

class InjectFaultRequest(BaseModel):
    scenario: str = "redis-timeout"  # redis-timeout | api-degradation | queue-backlog


class InjectFaultResponse(BaseModel):
    scenario: str
    raw_logs: str
    status: str


# ── Analysis (DeepSeek) ──

class AnalyzeRequest(BaseModel):
    raw_logs: str
    scenario_id: Optional[str] = None


class AnalyzeResponse(BaseModel):
    severity: str
    summary: str
    root_cause: str
    affected_services: list[str]
    confidence: float
    evidence: list[str]


class AutoTriageRequest(BaseModel):
    file_content: str
    file_name: str


class AutoTriageResponse(BaseModel):
    priority: str
    component: str
    title: str
    description: str


# ── Research (Perplexity) ──

class ResearchRequest(BaseModel):
    root_cause: str
    summary: str


class Fix(BaseModel):
    title: str
    command: str
    language: str
    source: str
    source_type: str  # "external" | "internal"


class ResearchResponse(BaseModel):
    fixes: list[Fix]


# ── Execute ──

class ExecuteRequest(BaseModel):
    fix_ids: list[int]
    commands: Optional[list[str]] = None
    root_cause: str


class ExecuteResult(BaseModel):
    fix_id: int
    command: str
    status: str
    output: str


class ExecuteResponse(BaseModel):
    success: bool
    results: list[ExecuteResult]
    new_health_status: str


# ── Post-Mortem ──

class PostMortemRequest(BaseModel):
    analysis: AnalyzeResponse
    fixes_applied: list[Fix]


class PostMortemResponse(BaseModel):
    title: str
    markdown_content: str


# ── Health ──

class HealthResponse(BaseModel):
    status: str
    incident_active: bool
    active_scenarios: list[str] = []
    metrics: dict

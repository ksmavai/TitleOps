/**
 * API client for the TitleOps FastAPI backend.
 * All endpoints return typed responses matching the backend Pydantic models.
 */

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api";

// ── Types ──

export interface HealthResponse {
    status: string;
    incident_active: boolean;
    active_scenarios: string[];
    metrics: {
        latency_ms: number;
        error_rate: number;
        cpu_percent: number;
        active_connections: number;
        queue_depth: number;
    };
}

export interface InjectFaultResponse {
    scenario: string;
    raw_logs: string;
    status: string;
}

export interface AnalyzeResponse {
    severity: string;
    summary: string;
    root_cause: string;
    affected_services: string[];
    confidence: number;
    evidence: string[];
}

export interface Fix {
    title: string;
    command: string;
    language: string;
    source: string;
    source_type: string;
}

export interface ResearchResponse {
    fixes: Fix[];
}

export interface ExecuteResult {
    fix_id: number;
    command: string;
    status: string;
    output: string;
}

export interface ExecuteResponse {
    success: boolean;
    resolution: "full" | "partial";
    message: string;
    results: ExecuteResult[];
    new_health_status: string;
    remaining_fixes?: number;
}

export interface ExecuteProgress {
    type: "progress" | "result";
    step?: number;
    total?: number;
    fix_id?: number;
    command?: string;
    status?: string;
    message?: string;
    // result fields
    success?: boolean;
    resolution?: "full" | "partial";
    results?: ExecuteResult[];
    new_health_status?: string;
    remaining_fixes?: number;
}

export interface PostMortemResponse {
    title: string;
    markdown_content: string;
}

export interface TelemetryPoint {
    time: string;
    latency: number;
}

export interface TelemetryResponse {
    source: "datadog" | "simulator";
    data: TelemetryPoint[];
}

// ── API Functions ──

export async function fetchHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json();
}

export async function fetchTelemetry(): Promise<TelemetryResponse> {
    const res = await fetch(`${API_BASE}/telemetry`);
    if (!res.ok) throw new Error(`Telemetry fetch failed: ${res.status}`);
    return res.json();
}

export async function injectFault(
    scenario: string = "redis-timeout"
): Promise<InjectFaultResponse> {
    const res = await fetch(`${API_BASE}/inject-fault`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
    });
    if (!res.ok) throw new Error(`Inject fault failed: ${res.status}`);
    return res.json();
}

export async function analyzeLogs(
    rawLogs: string,
    scenarioId?: string
): Promise<AnalyzeResponse> {
    const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_logs: rawLogs, scenario_id: scenarioId }),
    });
    if (!res.ok) throw new Error(`Analysis failed: ${res.status}`);
    return res.json();
}

export async function researchFix(
    rootCause: string,
    summary: string
): Promise<ResearchResponse> {
    const res = await fetch(`${API_BASE}/research-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ root_cause: rootCause, summary }),
    });
    if (!res.ok) throw new Error(`Research failed: ${res.status}`);
    return res.json();
}

export async function executeFixes(
    fixIds: number[],
    commands: string[] | undefined,
    rootCause: string,
    onProgress?: (progress: ExecuteProgress) => void,
): Promise<ExecuteResponse> {
    const res = await fetch(`${API_BASE}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fix_ids: fixIds, commands, root_cause: rootCause }),
    });
    if (!res.ok) throw new Error(`Execution failed: ${res.status}`);

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let finalResult: ExecuteResponse | null = null;
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const event: ExecuteProgress = JSON.parse(line);
                if (event.type === "result") {
                    finalResult = {
                        success: event.success ?? true,
                        resolution: event.resolution ?? "full",
                        message: event.message ?? "",
                        results: event.results ?? [],
                        new_health_status: event.new_health_status ?? "healthy",
                        remaining_fixes: event.remaining_fixes,
                    };
                } else if (onProgress) {
                    onProgress(event);
                }
            } catch { /* skip malformed lines */ }
        }
    }

    if (!finalResult) throw new Error("No final result from execution stream");
    return finalResult;
}

export async function generatePostMortem(
    analysis: AnalyzeResponse,
    fixesApplied: Fix[]
): Promise<PostMortemResponse> {
    const res = await fetch(`${API_BASE}/generate-postmortem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            analysis,
            fixes_applied: fixesApplied,
        }),
    });
    if (!res.ok) throw new Error(`Post-mortem generation failed: ${res.status}`);
    return res.json();
}

// ── Auto-Triage (Agent Studio) ──

export interface AutoTriageResponse {
    priority: string;
    component: string;
    title: string;
    description: string;
}

export async function autoTriage(
    fileContent: string,
    fileName: string
): Promise<AutoTriageResponse> {
    const res = await fetch(`${API_BASE}/auto-triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_content: fileContent, file_name: fileName }),
    });
    if (!res.ok) throw new Error(`Auto-triage failed: ${res.status}`);
    return res.json();
}

// ── Chat ──

export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface ChatResponse {
    reply: string;
}

export async function sendChatMessage(
    message: string,
    page: string,
    history: ChatMessage[]
): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, page, history }),
    });
    if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
    return res.json();
}

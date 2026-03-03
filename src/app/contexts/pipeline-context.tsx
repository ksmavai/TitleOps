/**
 * Pipeline Context — Manages the full AIOps pipeline state across dashboard components.
 *
 * Flow: IDLE → INJECTING → ANALYZING → RESEARCHING → READY_TO_EXECUTE → EXECUTING → RESOLVED
 */

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useEffect,
    type ReactNode,
} from "react";
import {
    fetchHealth,
    fetchTelemetry,
    injectFault,
    analyzeLogs,
    researchFix,
    executeFixes,
    generatePostMortem,
    type HealthResponse,
    type AnalyzeResponse,
    type Fix,
    type PostMortemResponse,
    type TelemetryPoint,
    type TelemetryResponse,
    type ExecuteProgress,
} from "@/lib/api";

export type PipelineStage =
    | "idle"
    | "injecting"
    | "analyzing"
    | "researching"
    | "ready_to_execute"
    | "executing"
    | "generating_postmortem"
    | "resolved";

interface PipelineState {
    stage: PipelineStage;
    health: HealthResponse | null;
    telemetry: TelemetryPoint[];
    telemetrySource: "datadog" | "simulator" | null;
    rawLogs: string | null;
    analysis: AnalyzeResponse | null;
    fixes: Fix[];
    selectedFixIds: number[];
    postMortem: PostMortemResponse | null;
    executeProgress: ExecuteProgress | null;
    error: string | null;
    isLoading: boolean;
}

interface PipelineActions {
    triggerFault: (scenario?: string) => Promise<void>;
    runAnalysis: () => Promise<void>;
    runResearch: () => Promise<void>;
    toggleFixSelection: (fixId: number) => void;
    selectAllFixes: () => void;
    runExecute: () => Promise<void>;
    runPostMortem: () => Promise<void>;
    resetPipeline: () => void;
    refreshHealth: () => Promise<void>;
}

type PipelineContextType = PipelineState & PipelineActions;

const PipelineContext = createContext<PipelineContextType | null>(null);

const INITIAL_STATE: PipelineState = {
    stage: "idle",
    health: null,
    telemetry: [],
    telemetrySource: null,
    rawLogs: null,
    analysis: null,
    fixes: [],
    selectedFixIds: [],
    postMortem: null,
    executeProgress: null,
    error: null,
    isLoading: false,
};

export function PipelineProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<PipelineState>(INITIAL_STATE);

    const updateState = useCallback(
        (partial: Partial<PipelineState>) =>
            setState((prev) => ({ ...prev, ...partial })),
        []
    );

    // Poll health + telemetry on mount, and every 10 seconds
    useEffect(() => {
        const loadData = async () => {
            try {
                const [health, telRes] = await Promise.all([
                    fetchHealth(),
                    fetchTelemetry(),
                ]);
                updateState({
                    health,
                    telemetry: telRes.data,
                    telemetrySource: telRes.source,
                });
            } catch {
                // Backend might not be running — use defaults
                updateState({
                    health: {
                        status: "healthy",
                        incident_active: false,
                        active_scenarios: [],
                        metrics: {
                            latency_ms: 32,
                            error_rate: 0.001,
                            cpu_percent: 24,
                            active_connections: 18,
                            queue_depth: 0,
                        },
                    },
                    telemetry: [],
                    telemetrySource: null,
                });
            }
        };
        loadData();
        const interval = setInterval(loadData, 10_000);
        return () => clearInterval(interval);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const triggerFault = useCallback(
        async (scenario = "redis-timeout") => {
            updateState({ stage: "injecting", isLoading: true, error: null });
            try {
                const result = await injectFault(scenario);
                const [health, telRes] = await Promise.all([
                    fetchHealth(),
                    fetchTelemetry(),
                ]);
                updateState({
                    stage: "analyzing",
                    rawLogs: result.raw_logs,
                    health,
                    telemetry: telRes.data,
                    telemetrySource: telRes.source,
                    isLoading: false,
                });
                // Auto-trigger analysis
            } catch (e) {
                updateState({
                    stage: "idle",
                    error: `Fault injection failed: ${e}`,
                    isLoading: false,
                });
            }
        },
        [updateState]
    );

    const runAnalysis = useCallback(async () => {
        if (!state.rawLogs) return;
        updateState({ stage: "analyzing", isLoading: true, error: null });
        try {
            const analysis = await analyzeLogs(state.rawLogs);
            updateState({ analysis, stage: "researching", isLoading: false });
        } catch (e) {
            updateState({
                error: `Analysis failed: ${e}`,
                isLoading: false,
            });
        }
    }, [state.rawLogs, updateState]);

    const runResearch = useCallback(async () => {
        if (!state.analysis) return;
        updateState({ stage: "researching", isLoading: true, error: null });
        try {
            const result = await researchFix(
                state.analysis.root_cause,
                state.analysis.summary
            );
            updateState({
                fixes: result.fixes,
                selectedFixIds: result.fixes.map((_, i) => i),
                stage: "ready_to_execute",
                isLoading: false,
            });
        } catch (e) {
            updateState({
                error: `Research failed: ${e}`,
                isLoading: false,
            });
        }
    }, [state.analysis, updateState]);

    const toggleFixSelection = useCallback(
        (fixId: number) => {
            setState((prev) => ({
                ...prev,
                selectedFixIds: prev.selectedFixIds.includes(fixId)
                    ? prev.selectedFixIds.filter((id) => id !== fixId)
                    : [...prev.selectedFixIds, fixId],
            }));
        },
        []
    );

    const selectAllFixes = useCallback(() => {
        setState((prev) => ({
            ...prev,
            selectedFixIds: prev.fixes.map((_, i) => i),
        }));
    }, []);

    const runExecute = useCallback(async () => {
        if (state.selectedFixIds.length === 0 || !state.analysis?.root_cause) return;
        updateState({ stage: "executing", isLoading: true, error: null, executeProgress: null });
        try {
            const commands = state.selectedFixIds.map(
                (id) => state.fixes[id]?.command || ""
            );
            const result = await executeFixes(state.selectedFixIds, commands, state.analysis.root_cause, (progress) => {
                updateState({ executeProgress: progress });
            });
            const [health, telRes] = await Promise.all([
                fetchHealth(),
                fetchTelemetry(),
            ]);

            if (result.resolution === "full") {
                // All fixes applied — proceed to post-mortem
                updateState({
                    stage: "generating_postmortem",
                    health,
                    telemetry: telRes.data,
                    telemetrySource: telRes.source,
                    isLoading: false,
                    executeProgress: null,
                });
            } else {
                // Partial fix — system still degraded
                // Keep the remaining fixes that were not selected, so the user can see what's left
                const remainingFixes = state.fixes.filter((_, idx) => !state.selectedFixIds.includes(idx));
                const appliedFixes = state.fixes.filter((_, idx) => state.selectedFixIds.includes(idx));

                const updatedAnalysis = state.analysis ? {
                    ...state.analysis,
                    summary: state.analysis.summary.includes("(Partially Resolved)") ? state.analysis.summary : `${state.analysis.summary} (Partially Resolved)`,
                    root_cause: `${state.analysis.root_cause}\n\n[UPDATE]: ${appliedFixes.length} actions were successfully applied, but the system remains degraded. Remaining ${remainingFixes.length} actions must be executed.`
                } : null;

                updateState({
                    stage: "ready_to_execute",
                    health,
                    telemetry: telRes.data,
                    telemetrySource: telRes.source,
                    fixes: remainingFixes,
                    analysis: updatedAnalysis,
                    selectedFixIds: [],
                    executeProgress: null,
                    error: result.message,
                    isLoading: false,
                });
            }
        } catch (e) {
            updateState({
                stage: "ready_to_execute",
                error: `Execution failed: ${e}`,
                isLoading: false,
                executeProgress: null,
            });
        }
    }, [state.selectedFixIds, state.fixes, updateState]);

    const runPostMortem = useCallback(async () => {
        if (!state.analysis) return;
        updateState({ stage: "generating_postmortem", isLoading: true, error: null });
        try {
            const appliedFixes = state.selectedFixIds.map((id) => state.fixes[id]);
            const postMortem = await generatePostMortem(state.analysis, appliedFixes);
            updateState({ postMortem, stage: "resolved", isLoading: false });
        } catch (e) {
            updateState({
                error: `Post-mortem generation failed: ${e}`,
                isLoading: false,
            });
        }
    }, [state.analysis, state.selectedFixIds, state.fixes, updateState]);

    const resetPipeline = useCallback(() => {
        setState(INITIAL_STATE);
        fetchHealth()
            .then((health) => fetchTelemetry().then((telRes) => updateState({ health, telemetry: telRes.data, telemetrySource: telRes.source })))
            .catch(() => { });
    }, [updateState]);

    const refreshHealth = useCallback(async () => {
        try {
            const [health, telRes] = await Promise.all([
                fetchHealth(),
                fetchTelemetry(),
            ]);
            updateState({ health, telemetry: telRes.data, telemetrySource: telRes.source });
        } catch {
            // Ignore
        }
    }, [updateState]);

    const value: PipelineContextType = {
        ...state,
        triggerFault,
        runAnalysis,
        runResearch,
        toggleFixSelection,
        selectAllFixes,
        runExecute,
        runPostMortem,
        resetPipeline,
        refreshHealth,
    };

    return (
        <PipelineContext.Provider value={value}>
            {children}
        </PipelineContext.Provider>
    );
}

export function usePipeline(): PipelineContextType {
    const ctx = useContext(PipelineContext);
    if (!ctx) throw new Error("usePipeline must be used within PipelineProvider");
    return ctx;
}

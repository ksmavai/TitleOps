import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
    Zap,
    Server,
    Clock,
    FileStack,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    ArrowRight,
    Radio,
    ShieldAlert,
    Globe,
    MemoryStick,
    Container,
} from "lucide-react";
import { PageTransition } from "../components/page-transition";
import { usePipeline } from "../contexts/pipeline-context";

interface ScenarioDef {
    id: string;
    name: string;
    description: string;
    icon: typeof Server;
    affectedServices: string[];
    expectedImpact: string;
    color: string;
}

const SCENARIOS: ScenarioDef[] = [
    {
        id: "redis-timeout",
        name: "Redis Connection Timeout",
        description:
            "Simulates connection pool exhaustion on the auth-redis-primary instance. All authentication and session lookups will fail, triggering circuit breakers on the gateway.",
        icon: Server,
        affectedServices: ["auth-service", "id-verification-api"],
        expectedImpact: "Auth failures, session timeouts, 5000ms+ latency",
        color: "text-critical",
    },
    {
        id: "api-degradation",
        name: "API Latency Spike",
        description:
            "Simulates upstream Interac API degradation. ID verification requests will timeout, queue depth will spike, and SLA breach alerts will fire across the gateway layer.",
        icon: Clock,
        affectedServices: ["id-verification-api", "gateway"],
        expectedImpact: "API timeouts, SLA breach, p99 latency 8400ms",
        color: "text-warning",
    },
    {
        id: "queue-backlog",
        name: "Document Processing Backlog",
        description:
            "Simulates worker pool exhaustion in the document processor. Queue will back up to 890+ documents with stuck workers and OOM kills. Title searches will be delayed 45+ minutes.",
        icon: FileStack,
        affectedServices: ["doc-processor", "title-search-service"],
        expectedImpact: "Queue backlog 890+, OOM kills, 45min search delays",
        color: "text-purple-500",
    },
    {
        id: "ssl-cert-expiry",
        name: "SSL Certificate Expiry",
        description:
            "Simulates an expired SSL/TLS certificate on *.titleops.fct.ca. All HTTPS connections fail, webhooks are rejected, and OAuth token refresh breaks across every service.",
        icon: ShieldAlert,
        affectedServices: ["title-search-service", "gateway", "nginx-ingress"],
        expectedImpact: "HTTPS failures, 502 errors, OAuth broken, 67% error rate",
        color: "text-red-400",
    },
    {
        id: "dns-resolution-failure",
        name: "DNS Resolution Failure",
        description:
            "Simulates DNS resolution failure for Salesforce APIs. CRM sync stops, 234 leads stuck, and the system falls back to stale cached data that's nearly an hour old.",
        icon: Globe,
        affectedServices: ["salesforce-sync", "crm-integration", "gateway"],
        expectedImpact: "CRM sync halted, 234 leads stuck, stale cache fallback",
        color: "text-orange-400",
    },
    {
        id: "memory-leak",
        name: "Memory Leak — RPA Worker",
        description:
            "Simulates a memory leak in the IBM Cloud Pak RPA worker. Browser handles pile up, GC stalls, and the worker OOM-kills itself repeatedly. Document processing grinds to a halt.",
        icon: MemoryStick,
        affectedServices: ["rpa-worker", "doc-processor", "title-search-service"],
        expectedImpact: "OOM kills, 847 leaked handles, 34s/doc latency, 97% CPU",
        color: "text-pink-500",
    },
    {
        id: "k8s-crashloop",
        name: "Kubernetes Pod CrashLoopBackOff",
        description:
            "Simulates a config-server outage causing cascading CrashLoopBackOff across id-verification and auth pods. HPA can't scale, CoreDNS returns NXDOMAIN, and the gateway has zero healthy endpoints.",
        icon: Container,
        affectedServices: ["id-verification-api", "auth-service", "k8s-cluster"],
        expectedImpact: "0 healthy pods, 92% error rate, full service outage",
        color: "text-cyan-400",
    },
];

export function Simulations() {
    const { triggerFault, stage, health } = usePipeline();
    const navigate = useNavigate();
    const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
    const [isInjecting, setIsInjecting] = useState(false);
    const [injectionResults, setInjectionResults] = useState<
        { id: string; status: "pending" | "running" | "done" | "error" }[]
    >([]);

    const incidentActive = health?.incident_active ?? false;

    const toggleScenario = (id: string) => {
        setSelectedScenarios((prev) =>
            prev.includes(id)
                ? prev.filter((s) => s !== id)
                : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelectedScenarios(SCENARIOS.map((s) => s.id));
    };

    const clearAll = () => {
        setSelectedScenarios([]);
    };

    const runSimulation = async () => {
        if (selectedScenarios.length === 0) return;
        setIsInjecting(true);
        setInjectionResults(
            selectedScenarios.map((id) => ({ id, status: "pending" }))
        );

        for (let i = 0; i < selectedScenarios.length; i++) {
            const scenarioId = selectedScenarios[i];

            // Mark current as running
            setInjectionResults((prev) =>
                prev.map((r) =>
                    r.id === scenarioId ? { ...r, status: "running" } : r
                )
            );

            try {
                await triggerFault(scenarioId);
                // Mark as done
                setInjectionResults((prev) =>
                    prev.map((r) =>
                        r.id === scenarioId ? { ...r, status: "done" } : r
                    )
                );
            } catch {
                setInjectionResults((prev) =>
                    prev.map((r) =>
                        r.id === scenarioId ? { ...r, status: "error" } : r
                    )
                );
            }

            // Small delay between injections for visual feedback
            if (i < selectedScenarios.length - 1) {
                await new Promise((r) => setTimeout(r, 800));
            }
        }

        setIsInjecting(false);
    };

    const goToDashboard = () => {
        navigate("/");
    };

    const allInjected = injectionResults.length > 0 &&
        injectionResults.every((r) => r.status === "done" || r.status === "error");

    return (
        <PageTransition>
            <div className="h-full p-8 max-w-5xl mx-auto overflow-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-[1.5rem] font-bold text-foreground flex items-center gap-3">
                        <div className="skeu-avatar w-9 h-9 bg-critical/90 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        Chaos Simulations
                    </h1>
                    <p className="text-[0.875rem] text-muted-foreground mt-2 ml-12">
                        Inject controlled failure scenarios to test the AI incident response pipeline.
                        Select one or more scenarios to trigger simultaneously.
                    </p>
                </div>

                {/* Active Incident Warning */}
                <AnimatePresence>
                    {incidentActive && !isInjecting && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="skeu-card p-4 mb-6 border border-warning/30 bg-warning/5"
                        >
                            <div className="flex items-center justify-between relative z-[1]">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-warning" />
                                    <div>
                                        <p className="text-[0.875rem] font-medium text-foreground">
                                            Incident currently active
                                        </p>
                                        <p className="text-[0.75rem] text-muted-foreground">
                                            Scenario: <span className="font-medium">{health?.active_scenarios?.join(", ")}</span> — head to the Dashboard to manage the response.
                                        </p>
                                    </div>
                                </div>
                                <motion.button
                                    onClick={goToDashboard}
                                    className="skeu-btn bg-primary/90 text-white px-4 py-2 text-[0.8125rem] font-medium flex items-center gap-2"
                                    whileTap={{ scale: 0.97 }}
                                >
                                    Go to Dashboard
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scenario Cards */}
                <div className="grid gap-4 mb-6">
                    {SCENARIOS.map((scenario) => {
                        const isSelected = selectedScenarios.includes(scenario.id);
                        const result = injectionResults.find((r) => r.id === scenario.id);
                        const Icon = scenario.icon;

                        return (
                            <motion.div
                                key={scenario.id}
                                layout
                                className={`
                  skeu-card p-5 cursor-pointer transition-all
                  ${isSelected && !result ? "ring-2 ring-primary/40 border-primary/30" : ""}
                  ${result?.status === "done" ? "ring-2 ring-success/40 border-success/30" : ""}
                  ${result?.status === "running" ? "ring-2 ring-primary/40 border-primary/30" : ""}
                  ${result?.status === "error" ? "ring-2 ring-critical/40 border-critical/30" : ""}
                  ${incidentActive && !isInjecting ? "opacity-50 pointer-events-none" : ""}
                  ${isInjecting ? "pointer-events-none" : ""}
                `}
                                onClick={() => !isInjecting && !incidentActive && toggleScenario(scenario.id)}
                                whileTap={!isInjecting && !incidentActive ? { scale: 0.995 } : {}}
                            >
                                <div className="flex items-start gap-4 relative z-[1]">
                                    {/* Checkbox / Status */}
                                    <div className="pt-0.5">
                                        {!result && (
                                            <div
                                                className={`
                          w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                          ${isSelected
                                                        ? "bg-primary border-primary"
                                                        : "border-muted-foreground/40 bg-transparent"
                                                    }
                        `}
                                            >
                                                {isSelected && (
                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                        <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                )}
                                            </div>
                                        )}
                                        {result?.status === "done" && <CheckCircle2 className="w-5 h-5 text-success" />}
                                        {result?.status === "running" && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
                                        {result?.status === "error" && <AlertTriangle className="w-5 h-5 text-critical" />}
                                        {result?.status === "pending" && (
                                            <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <Icon className={`w-4.5 h-4.5 ${scenario.color} flex-shrink-0`} />
                                            <h3 className="text-[0.9375rem] font-semibold text-foreground">
                                                {scenario.name}
                                            </h3>
                                        </div>
                                        <p className="text-[0.8125rem] text-muted-foreground leading-relaxed mb-3">
                                            {scenario.description}
                                        </p>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-2">
                                            {scenario.affectedServices.map((svc) => (
                                                <span
                                                    key={svc}
                                                    className="text-[0.6875rem] px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground font-mono skeu-badge"
                                                >
                                                    {svc}
                                                </span>
                                            ))}
                                            <span className="text-[0.6875rem] px-2 py-0.5 rounded-md bg-critical/10 text-critical font-medium skeu-badge">
                                                {scenario.expectedImpact}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Action Bar */}
                <div className="skeu-card p-5">
                    <div className="flex items-center justify-between relative z-[1]">
                        <div className="flex items-center gap-4">
                            {!allInjected && (
                                <>
                                    <button
                                        onClick={selectAll}
                                        className="text-[0.8125rem] text-primary hover:underline disabled:opacity-40"
                                        disabled={isInjecting || incidentActive}
                                    >
                                        Select All
                                    </button>
                                    <span className="text-muted-foreground/30">|</span>
                                    <button
                                        onClick={clearAll}
                                        className="text-[0.8125rem] text-muted-foreground hover:text-foreground disabled:opacity-40"
                                        disabled={isInjecting || incidentActive}
                                    >
                                        Clear
                                    </button>
                                    <span className="text-[0.8125rem] text-muted-foreground">
                                        {selectedScenarios.length} of {SCENARIOS.length} selected
                                    </span>
                                </>
                            )}
                            {allInjected && (
                                <div className="flex items-center gap-2 text-success">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-[0.8125rem] font-medium">
                                        Simulation injected — incident is now active
                                    </span>
                                </div>
                            )}
                        </div>

                        {!allInjected ? (
                            <motion.button
                                onClick={runSimulation}
                                className={`
                  skeu-btn px-6 py-2.5 text-[0.875rem] font-semibold flex items-center gap-2.5
                  ${selectedScenarios.length > 0 && !incidentActive
                                        ? "bg-critical/90 text-white"
                                        : "skeu-gauge text-muted-foreground cursor-not-allowed"
                                    }
                `}
                                whileTap={
                                    selectedScenarios.length > 0 && !incidentActive
                                        ? { scale: 0.97 }
                                        : {}
                                }
                                disabled={selectedScenarios.length === 0 || isInjecting || incidentActive}
                            >
                                {isInjecting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Injecting...
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4" />
                                        Launch Simulation ({selectedScenarios.length})
                                    </>
                                )}
                            </motion.button>
                        ) : (
                            <motion.button
                                onClick={goToDashboard}
                                className="skeu-btn bg-primary/90 text-white px-6 py-2.5 text-[0.875rem] font-semibold flex items-center gap-2.5"
                                whileTap={{ scale: 0.97 }}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <Radio className="w-4 h-4" />
                                View on Dashboard
                                <ArrowRight className="w-3.5 h-3.5" />
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}

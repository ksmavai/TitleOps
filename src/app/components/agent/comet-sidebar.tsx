import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, CheckCircle2, Loader2, Sparkles, ChevronRight } from "lucide-react";

interface CometSidebarProps {
    active: boolean;
    isExecuting: boolean;
    isThinking: boolean;
    data: {
        priority: string;
        component: string;
        title: string;
        description: string;
    } | null;
    fileName?: string;
    onClose: () => void;
}

interface LogStep {
    id: string;
    text: string;
    status: "pending" | "running" | "done";
    detail?: string;
}

export function CometSidebar({ active, isExecuting, isThinking, data, fileName, onClose }: CometSidebarProps) {
    const [steps, setSteps] = useState<LogStep[]>([]);
    const [isComplete, setIsComplete] = useState(false);
    const isThinkingRef = useRef(isThinking);
    const dataRef = useRef(data);

    useEffect(() => {
        isThinkingRef.current = isThinking;
        dataRef.current = data;
    }, [isThinking, data]);

    // Finish step 6 when GhostCursor stops executing
    useEffect(() => {
        if (!isExecuting && active && steps.length > 0) {
            setSteps(prev => prev.map(s => s.id === "6" ? { ...s, status: "done" } : s));
            setIsComplete(true);
        }
    }, [isExecuting, active]);

    useEffect(() => {
        if (!active) {
            setSteps([]);
            setIsComplete(false);
            return;
        }

        // Prevent StrictMode duplication
        setSteps([]);
        setIsComplete(false);

        let isMounted = true;

        const runScript = async () => {
            const addStep = (id: string, text: string, detail?: string) => {
                if (isMounted) setSteps(prev => [...prev, { id, text, status: "pending", detail }]);
            };
            const updateStep = (id: string, status: "running" | "done") => {
                if (isMounted) setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s));
            };

            const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

            // Setup script
            addStep("1", `Ingesting ${fileName || "file"}...`);
            updateStep("1", "running");
            await sleep(800);
            updateStep("1", "done");

            addStep("2", "Analyzing log stacktrace...");
            updateStep("2", "running");

            // Wait for API to finish thinking
            while (isThinkingRef.current && isMounted) {
                await sleep(500);
            }
            const currentData = dataRef.current;
            if (!isMounted || !currentData) return; // Exit if unmounted or API failed

            updateStep("2", "done");

            addStep("3", "Identifying root cause...", "Analyzed via DeepSeek V3 Context Window.");
            updateStep("3", "running");
            await sleep(1000); // t = 1000
            updateStep("3", "done");

            addStep("4", "Executing Auto-Drive to create ServiceNow Incident...");
            updateStep("4", "running");

            // t = 1000 -> Target Priority click is at t=1750
            await sleep(750);
            updateStep("4", "done");

            addStep("5", "Filling incident details...");
            updateStep("5", "running");

            // t = 1750 -> Target Component click is at t=3700
            await sleep(1950);

            // t = 3700 -> Target Title click is at t=5650
            await sleep(1950);

            // t = 5650 -> Target Description click is at t=7900
            await sleep(2250);
            updateStep("5", "done");

            addStep("6", "Awaiting operator review...");
            updateStep("6", "running");
        };

        runScript();

        return () => {
            isMounted = false;
        };
    }, [active, fileName]);

    return (
        <AnimatePresence>
            {active && (
                <motion.div
                    initial={{ x: 340, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 340, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="absolute right-0 top-0 bottom-0 w-[340px] bg-background border-l border-border/50 shadow-2xl flex flex-col z-40 transform-gpu"
                >
                    {/* Header */}
                    <div className="h-14 border-b border-border/50 flex items-center px-4 gap-3 bg-muted/20">
                        <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-primary">
                            <Bot className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm">Agent Auto-Drive</span>
                        <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Active</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-5">
                        <h3 className="text-lg font-bold text-foreground mb-1">Taking control</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Triaging the uploaded log and filling out the incident report on your behalf.
                        </p>

                        <div className="space-y-4 relative">
                            {/* Vertical connecting line */}
                            <div className="absolute left-[11px] top-2 bottom-6 w-0.5 bg-border/40" />

                            {steps.map((step, idx) => (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="relative z-10 pl-8"
                                >
                                    {/* Icon Indicator */}
                                    <div className="absolute left-0 top-1">
                                        {step.status === "done" ? (
                                            <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center text-success">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                        ) : step.status === "running" ? (
                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full border-2 border-border/60 bg-background" />
                                        )}
                                    </div>

                                    {/* Text */}
                                    <div className={`text-sm ${step.status === "pending" ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                                        {step.text}
                                    </div>

                                    {/* Detail Card */}
                                    {step.detail && step.status !== "pending" && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            className="mt-2 bg-muted/40 border border-border/50 rounded-md p-3"
                                        >
                                            <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                                                <Sparkles className="w-3 h-3 inline-block mr-1 text-primary" />
                                                {step.detail}
                                            </p>
                                        </motion.div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Status */}
                    <div className="p-4 border-t border-border/50 bg-muted/10">
                        {isComplete ? (
                            <button onClick={onClose} className="w-full py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-sm">
                                Done
                                <CheckCircle2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={() => { setIsComplete(true); }}
                                className="w-full py-2.5 rounded-md border border-border/80 text-sm font-medium hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                            >
                                Skip remaining steps
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

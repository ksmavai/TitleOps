import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, UploadCloud, X, Send, FileText, CheckCircle2, ChevronDown } from "lucide-react";
import { PageTransition } from "../components/page-transition";
import { CometSidebar } from "../components/agent/comet-sidebar";
import { GhostCursor } from "../components/agent/ghost-cursor";
import { autoTriage, AutoTriageResponse } from "@/lib/api";

export function AgentStudio() {
    const [isDragging, setIsDragging] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [aiData, setAiData] = useState<AutoTriageResponse | null>(null);
    const [isThinking, setIsThinking] = useState(false);

    // Form refs for the Ghost Cursor to target
    const priorityRef = useRef<HTMLDivElement>(null);
    const priorityOptionRef = useRef<HTMLDivElement>(null);
    const componentRef = useRef<HTMLDivElement>(null);
    const componentOptionRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);
    const submitRef = useRef<HTMLButtonElement>(null);

    // Stable cursor targets for GhostCursor
    const cursorTargets = useMemo(() => ({
        priority: priorityRef,
        priorityOption: priorityOptionRef,
        component: componentRef,
        componentOption: componentOptionRef,
        title: titleRef,
        description: descRef,
        submit: submitRef
    }), []);

    // Form state
    const [priority, setPriority] = useState("");
    const [component, setComponent] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    // Custom dropdown states
    const [isPriorityOpen, setIsPriorityOpen] = useState(false);
    const [isComponentOpen, setIsComponentOpen] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setUploadedFile(e.dataTransfer.files[0]);
        }
    };

    const startAgent = async () => {
        if (!uploadedFile) return;
        setIsThinking(true);
        setShowSidebar(true);
        setIsExecuting(true); // show pulsing screen & sidebar immediately

        try {
            const text = await uploadedFile.text();
            const data = await autoTriage(text, uploadedFile.name);
            setAiData(data);
        } catch (err) {
            console.error(err);
            // Fallback so the demo doesn't completely break
            setAiData({
                priority: "2",
                component: "gateway",
                title: "Failed to parse DeepSeek response",
                description: "The AI agent experienced an error communicating with the API. Falling back to default data."
            });
        } finally {
            setIsThinking(false);
        }
    };

    const clearFile = useCallback(() => {
        setIsSubmitted((prev) => {
            if (prev) {
                // Delay state destruction by 400ms to allow the Success Card to run its AnimatePresence exit transition 
                setTimeout(() => {
                    setUploadedFile(null);
                    setShowSidebar(false);
                    setIsExecuting(false);
                    setAiData(null);
                    setIsThinking(false);
                    setPriority("");
                    setComponent("");
                    setTitle("");
                    setDescription("");
                }, 400);
                return false;
            } else {
                setUploadedFile(null);
                setShowSidebar(false);
                setIsExecuting(false);
                setAiData(null);
                setIsThinking(false);
                setPriority("");
                setComponent("");
                setTitle("");
                setDescription("");
                return false;
            }
        });
    }, []);

    // Auto-dismiss success screen after 8 seconds
    useEffect(() => {
        if (isSubmitted) {
            const timer = setTimeout(() => {
                clearFile();
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [isSubmitted, clearFile]);

    const handleFormUpdate = useCallback((field: string, value: string) => {
        if (field === "priority") {
            setPriority(value);
            setIsPriorityOpen(false);
        }
        if (field === "component") {
            setComponent(value);
            setIsComponentOpen(false);
        }
        if (field === "title") setTitle(value);
        if (field === "description") setDescription(value);
    }, []);

    const handleComplete = useCallback(() => {
        setIsExecuting(false);
    }, []);

    return (
        <PageTransition>
            <div className="h-full flex relative overflow-hidden bg-background">

                {/* Comet Assistant Glowing Border Effect */}
                <AnimatePresence>
                    {isExecuting && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="pointer-events-none absolute inset-0 z-50 pointer-events-none"
                            style={{
                                boxShadow: "inset 0 0 120px 20px rgba(30, 58, 138, 0.4), inset 0 0 20px 2px rgba(59, 130, 246, 0.3)",
                                border: "4px solid rgba(30, 58, 138, 0.6)"
                            }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-blue-500/5 mix-blend-overlay"
                                animate={{ opacity: [0.5, 0.8, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content Area */}
                <div className={`flex-1 p-8 overflow-y-auto transition-all duration-500 max-w-5xl mx-auto ${showSidebar ? "pr-[340px]" : ""}`}>

                    <div className="mb-8">
                        <h1 className="text-[1.5rem] font-bold text-foreground flex items-center gap-3">
                            <div className="skeu-avatar w-9 h-9 bg-primary/90 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            Auto-Drive Agent Studio
                        </h1>
                        <p className="text-[0.875rem] text-muted-foreground mt-2 ml-12">
                            Drag and drop a raw log file, customer email, or vendor advisory to watch the Agent autonomously triage the incident and fill out a ServiceNow ticket.
                        </p>
                    </div>

                    {!uploadedFile ? (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`
                                mt-12 border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center transition-all cursor-pointer
                                ${isDragging ? "border-primary bg-primary/5" : "border-border/60 bg-muted/20 hover:bg-muted/30"}
                            `}
                            onClick={() => {
                                // For easy testing if user clicks the dropzone
                                const file = new File(['testing content'], 'dragged_log.txt', { type: 'text/plain' });
                                setUploadedFile(file);
                            }}
                        >
                            <div className={`p-4 rounded-full mb-4 ${isDragging ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                                <UploadCloud className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">Drop a file here to begin</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-sm">
                                Support raw .txt logs, .json payloads, or .eml customer files to initiate the autonomous tracking agent.
                            </p>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* File Status Bar */}
                            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-indigo-400" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                                        <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {!showSidebar && (
                                        <button
                                            onClick={startAgent}
                                            className="skeu-btn bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm font-medium flex items-center gap-2"
                                        >
                                            <Bot className="w-4 h-4" />
                                            Auto-Triage Incident
                                        </button>
                                    )}
                                    <button onClick={clearFile} className="p-2 text-muted-foreground hover:text-white transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Servicenow Form Mockup */}
                            <AnimatePresence mode="wait">
                                {isSubmitted ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.4 }}
                                        className="flex flex-col items-center justify-center p-16 skeu-card border-t-[4px] border-t-emerald-500 text-center"
                                    >
                                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-foreground mb-2">Incident INC049821 Created</h2>
                                        <p className="text-muted-foreground max-w-md mx-auto mb-8">
                                            The issue has been successfully logged in ServiceNow and routed to the <strong>{component || "appropriate"}</strong> engineering queue.
                                        </p>
                                        <button onClick={clearFile} className="bg-muted border border-border/50 hover:bg-muted/80 text-foreground px-6 py-2 rounded-md text-sm font-medium transition-colors">
                                            Triage Another File
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="form"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="skeu-card p-6 border-t-[4px] border-t-blue-500"
                                    >
                                        <h2 className="text-lg font-semibold text-foreground mb-6 uppercase tracking-wider text-muted-foreground">ServiceNow Incident Record</h2>

                                        <div className="grid grid-cols-2 gap-6 mb-6">
                                            <div className="space-y-2 relative">
                                                <label className="text-xs font-bold text-muted-foreground">PRIORITY</label>
                                                <div
                                                    ref={priorityRef}
                                                    onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                                                    className="w-full bg-background border border-border/50 rounded-md py-2 px-3 text-sm text-foreground flex justify-between items-center cursor-pointer select-none"
                                                >
                                                    {priority ? (
                                                        priority === "1" ? "1 - Critical" :
                                                            priority === "2" ? "2 - High" :
                                                                priority === "3" ? "3 - Moderate" : "4 - Low"
                                                    ) : "-- None --"}
                                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                </div>

                                                <AnimatePresence>
                                                    {isPriorityOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -5 }}
                                                            transition={{ duration: 0.15 }}
                                                            className="absolute z-50 w-full mt-1 bg-background border border-border/50 rounded-md shadow-lg py-1"
                                                        >
                                                            {['1', '2', '3', '4'].map(p => (
                                                                <div
                                                                    key={p}
                                                                    ref={aiData?.priority?.includes(p) ? priorityOptionRef : null}
                                                                    onClick={() => { setPriority(p); setIsPriorityOpen(false); }}
                                                                    className="px-3 py-2 text-sm hover:bg-muted cursor-pointer select-none"
                                                                >
                                                                    {p} - {p === '1' ? 'Critical' : p === '2' ? 'High' : p === '3' ? 'Moderate' : 'Low'}
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <div className="space-y-2 relative">
                                                <label className="text-xs font-bold text-muted-foreground">AFFECTED COMPONENT</label>
                                                <div
                                                    ref={componentRef}
                                                    onClick={() => setIsComponentOpen(!isComponentOpen)}
                                                    className="w-full bg-background border border-border/50 rounded-md py-2 px-3 text-sm text-foreground flex justify-between items-center cursor-pointer select-none"
                                                >
                                                    {component || "-- None --"}
                                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                </div>

                                                <AnimatePresence>
                                                    {isComponentOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -5 }}
                                                            transition={{ duration: 0.15 }}
                                                            className="absolute z-50 w-full mt-1 bg-background border border-border/50 rounded-md shadow-lg py-1"
                                                        >
                                                            {['auth-service', 'gateway', 'rpa-worker', 'salesforce-sync'].map(c => (
                                                                <div
                                                                    key={c}
                                                                    ref={aiData?.component?.toLowerCase() === c.toLowerCase() ? componentOptionRef : null}
                                                                    onClick={() => { setComponent(c); setIsComponentOpen(false); }}
                                                                    className="px-3 py-2 text-sm hover:bg-muted cursor-pointer select-none"
                                                                >
                                                                    {c}
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-6">
                                            <label className="text-xs font-bold text-muted-foreground">SHORT DESCRIPTION</label>
                                            <input
                                                ref={titleRef}
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                className="w-full bg-background border border-border/50 rounded-md py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>

                                        <div className="space-y-2 mb-8">
                                            <label className="text-xs font-bold text-muted-foreground">FULL DESCRIPTION & LOGS</label>
                                            <textarea
                                                ref={descRef}
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                rows={8}
                                                className="w-full bg-background border border-border/50 rounded-md py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                                            />
                                        </div>

                                        <div className="flex justify-end gap-3">
                                            <button className="px-4 py-2 text-sm text-muted-foreground hover:text-white transition-colors border border-transparent hover:border-border/50 rounded-md">
                                                Cancel
                                            </button>
                                            <button
                                                ref={submitRef}
                                                onClick={() => setIsSubmitted(true)}
                                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                                            >
                                                <Send className="w-4 h-4" />
                                                Submit Incident
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </div>

                {/* Agent Sidebar */}
                <CometSidebar
                    active={showSidebar}
                    isExecuting={isExecuting}
                    isThinking={isThinking}
                    data={aiData}
                    fileName={uploadedFile?.name}
                    onClose={useCallback(() => setShowSidebar(false), [])}
                />

                {/* Ghost Cursor Layer */}
                {isExecuting && aiData && (
                    <GhostCursor
                        data={aiData}
                        onFormUpdate={handleFormUpdate}
                        targets={cursorTargets}
                        onComplete={handleComplete}
                    />
                )}
            </div>
        </PageTransition>
    );
}

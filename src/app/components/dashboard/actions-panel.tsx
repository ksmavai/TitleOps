import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Shield, Zap, Loader2, RotateCcw, CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { usePipeline } from "../../contexts/pipeline-context";

export function ActionsPanel() {
  const {
    stage,
    fixes,
    selectedFixIds,
    isLoading,
    error,
    executeProgress,
    toggleFixSelection,
    selectAllFixes,
    runExecute,
    triggerFault,
    resetPipeline,
    runPostMortem,
  } = usePipeline();

  const navigate = useNavigate();

  const isIdle = stage === "idle";
  const isReadyToExecute = stage === "ready_to_execute";
  const isExecuting = stage === "executing";
  const showPostMortemAction = stage === "generating_postmortem";
  const isResolved = stage === "resolved";

  return (
    <div className="skeu-card p-6">
      <div className="flex items-center justify-between mb-4 relative z-[1]">
        <h2 className="text-[0.875rem] font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Actions</span>
        </h2>
      </div>

      <div className="space-y-4 relative z-[1]">
        {/* Idle */}
        {isIdle && (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-2 relative z-10">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 text-success" />
            </div>
            <p className="text-[0.875rem] font-semibold text-foreground">
              No active incidents.
            </p>
            <p className="text-[0.75rem] text-muted-foreground">
              Your system looks all good!
            </p>
          </div>
        )}

        {/* Pipeline is running — show progress */}
        {!isIdle && !isReadyToExecute && !isExecuting && !isResolved && !showPostMortemAction && (
          <div className="flex flex-col items-center py-4 gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-[0.8125rem] text-muted-foreground">
              {stage === "injecting" && "Injecting fault..."}
              {stage === "analyzing" && "DeepSeek analyzing logs..."}
              {stage === "researching" && "Searching for fixes..."}
            </p>
          </div>
        )}

        {/* Executing — show per-fix progress */}
        {isExecuting && (
          <div className="space-y-3">
            <p className="text-[0.75rem] text-muted-foreground font-medium">
              Applying fixes...
            </p>
            {fixes.map((fix, idx) => {
              const step = executeProgress?.step ?? 0;
              const currentFixStatus = executeProgress?.status;
              let fixState: "pending" | "running" | "done" = "pending";

              if (selectedFixIds.includes(idx)) {
                const fixEventIndex = selectedFixIds.indexOf(idx) + 1; // 1-indexed to match API step
                if (fixEventIndex < step || (fixEventIndex === step && currentFixStatus === "complete")) {
                  fixState = "done";
                } else if (fixEventIndex === step && currentFixStatus === "running") {
                  fixState = "running";
                }
              }

              return (
                <div
                  key={idx}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl transition-all
                    ${fixState === "done" ? "skeu-inset bg-success/5" : ""}
                    ${fixState === "running" ? "skeu-inset bg-primary/5 ring-1 ring-primary/20" : ""}
                    ${fixState === "pending" ? "skeu-gauge opacity-50" : ""}
                  `}
                >
                  {fixState === "done" && <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />}
                  {fixState === "running" && <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />}
                  {fixState === "pending" && <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8125rem] text-foreground truncate">{fix.title}</p>
                    {fixState === "running" && (
                      <p className="text-[0.6875rem] text-primary mt-0.5">Executing command...</p>
                    )}
                    {fixState === "done" && (
                      <p className="text-[0.6875rem] text-success mt-0.5">Applied</p>
                    )}
                  </div>
                </div>
              );
            })}
            {executeProgress && (
              <div className="skeu-inset p-2 text-center">
                <span className="text-[0.6875rem] text-muted-foreground">
                  {executeProgress.message}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Ready to execute — show fix selection */}
        {isReadyToExecute && fixes.length > 0 && (
          <div className="space-y-3">
            {/* Warning banner for partial fix */}
            {error && (
              <div className="skeu-inset p-3 bg-warning/10 border border-warning/20 rounded-xl">
                <p className="text-[0.75rem] text-warning font-medium">⚠ System still degraded</p>
                <p className="text-[0.6875rem] text-muted-foreground mt-1">{error}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-[0.75rem] text-muted-foreground">Select fixes to apply</p>
              <button onClick={selectAllFixes} className="text-[0.6875rem] text-primary hover:underline">
                Select All
              </button>
            </div>

            {fixes.map((fix, idx) => {
              const isSelected = selectedFixIds.includes(idx);
              return (
                <label
                  key={idx}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
                    ${isSelected
                      ? 'skeu-inset bg-primary/5 border-primary/30'
                      : 'skeu-gauge hover:bg-background/50'}
                  `}
                >
                  {/* Custom checkbox with actual check mark */}
                  <div
                    className={`
                      w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                      ${isSelected
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/40 bg-transparent'}
                    `}
                    onClick={(e) => { e.preventDefault(); toggleFixSelection(idx); }}
                  >
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2.5 6L5 8.5L9.5 3.5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleFixSelection(idx)}
                    className="sr-only"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8125rem] text-foreground font-medium truncate">{fix.title}</p>
                    <span className={`
                      text-[0.6875rem] font-medium rounded-md px-1.5 py-0.5
                      ${fix.source_type === 'external' ? 'bg-primary/10 text-primary' : 'bg-success/10 text-success'}
                    `}>
                      {fix.source_type}
                    </span>
                  </div>
                </label>
              );
            })}

            <motion.button
              onClick={runExecute}
              className={`
                w-full skeu-btn px-4 py-3 text-[0.8125rem] font-semibold flex items-center justify-center gap-2
                ${selectedFixIds.length > 0
                  ? 'bg-success/90 text-white'
                  : 'skeu-gauge text-muted-foreground cursor-not-allowed'}
              `}
              whileTap={selectedFixIds.length > 0 ? { scale: 0.98 } : {}}
              disabled={selectedFixIds.length === 0 || isLoading}
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              Approve & Execute ({selectedFixIds.length})
            </motion.button>
          </div>
        )}

        {/* Resolved — show post-mortem + reset */}
        {(isResolved || showPostMortemAction) && (
          <div className="space-y-3">
            <div className="skeu-inset p-4 bg-success/5">
              <p className="text-[0.8125rem] text-success font-medium">✓ Incident resolved successfully</p>
              <p className="text-[0.6875rem] text-muted-foreground mt-1">
                All selected fixes have been applied
              </p>
            </div>

            {stage === "generating_postmortem" && (
              <motion.button
                onClick={runPostMortem}
                className="w-full skeu-btn bg-primary/90 text-white px-4 py-3 text-[0.8125rem] font-semibold flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Generate Post-Mortem"
                )}
              </motion.button>
            )}

            <motion.button
              onClick={resetPipeline}
              className="w-full skeu-btn skeu-gauge px-4 py-2.5 text-[0.8125rem] font-medium text-muted-foreground flex items-center justify-center gap-2"
              whileTap={{ scale: 0.98 }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Pipeline
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

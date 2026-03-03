import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Loader2 } from "lucide-react";
import { usePipeline } from "../../contexts/pipeline-context";

export function ErrorAnalysisCard() {
  const { stage, analysis, rawLogs, isLoading, runAnalysis } = usePipeline();
  const [expandedError, setExpandedError] = useState<number | null>(null);

  // Auto-run analysis when we have raw logs and are in the analyzing stage
  useEffect(() => {
    if (rawLogs && stage === "analyzing" && !analysis && !isLoading) {
      runAnalysis();
    }
  }, [rawLogs, stage, analysis, isLoading, runAnalysis]);

  // Auto-expand when analysis arrives
  useEffect(() => {
    if (analysis) setExpandedError(0);
  }, [analysis]);

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return 'bg-critical text-white';
      case 'WARNING': return 'bg-warning text-white';
      case 'INFO': return 'bg-primary text-white';
      default: return 'bg-muted-foreground text-white';
    }
  };

  // Show loading state while analyzing
  if (stage === "analyzing" && isLoading) {
    return (
      <div className="skeu-card p-6">
        <div className="flex items-center justify-between mb-4 relative z-[1]">
          <h2 className="text-[0.875rem] font-semibold text-foreground flex items-center gap-2">
            <span>&#9889;</span>
            <span>Error Analysis</span>
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3 relative z-[1]">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-[0.8125rem] text-muted-foreground">DeepSeek is analyzing logs...</p>
        </div>
      </div>
    );
  }

  // Show placeholder when no analysis yet
  if (!analysis) {
    return (
      <div className="skeu-card p-6">
        <div className="flex items-center justify-between mb-4 relative z-[1]">
          <h2 className="text-[0.875rem] font-semibold text-foreground flex items-center gap-2">
            <span>&#9889;</span>
            <span>Error Analysis</span>
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-2 relative z-[1]">
          <p className="text-[0.8125rem] text-muted-foreground">No active incidents</p>
          <p className="text-[0.6875rem] text-muted-foreground/60">Inject a fault to start analysis</p>
        </div>
      </div>
    );
  }

  // Build error items from analysis
  const errors = [
    {
      id: 0,
      title: analysis.summary,
      severity: analysis.severity.toUpperCase() as 'CRITICAL' | 'WARNING' | 'INFO',
      description: analysis.root_cause,
      confidence: Math.round(analysis.confidence * 100),
      evidence: analysis.evidence,
      affected_services: analysis.affected_services,
    },
  ];

  return (
    <div className="skeu-card p-6">
      <div className="flex items-center justify-between mb-4 relative z-[1]">
        <h2 className="text-[0.875rem] font-semibold text-foreground flex items-center gap-2">
          <span>&#9889;</span>
          <span>Error Analysis</span>
        </h2>
      </div>

      <div className="space-y-3 relative z-[1]">
        {errors.map((error) => {
          const isExpanded = expandedError === error.id;
          return (
            <div
              key={error.id}
              className="skeu-inset overflow-hidden"
            >
              <button
                onClick={() => setExpandedError(isExpanded ? null : error.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-background/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                  <span className="text-[0.8125rem] text-foreground">Root Cause Analysis</span>
                </div>
                <span className={`px-2 py-0.5 text-[0.6875rem] font-semibold skeu-badge ${getSeverityColor(error.severity)}`}>
                  {error.severity}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key={`error-detail-${error.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                      opacity: { duration: 0.2, ease: "easeInOut" },
                    }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="px-4 pb-4 border-t border-border">
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-[0.75rem] text-muted-foreground mb-1">Alert</p>
                          <p className="text-[0.8125rem] text-foreground font-medium">{error.title}</p>
                        </div>

                        <div>
                          <p className="text-[0.75rem] text-muted-foreground mb-1">Diagnosis</p>
                          <p className="text-[0.8125rem] text-foreground">{error.description}</p>
                        </div>

                        <div>
                          <p className="text-[0.75rem] text-muted-foreground mb-1">Affected Services</p>
                          <div className="flex flex-wrap gap-1.5">
                            {error.affected_services.map((svc) => (
                              <span key={svc} className="px-2 py-0.5 text-[0.625rem] font-medium skeu-badge bg-primary/15 text-primary">
                                {svc}
                              </span>
                            ))}
                          </div>
                        </div>

                        {error.evidence.length > 0 && (
                          <div>
                            <p className="text-[0.75rem] text-muted-foreground mb-1">Evidence</p>
                            <div className="space-y-1">
                              {error.evidence.slice(0, 3).map((ev, i) => (
                                <p key={i} className="text-[0.6875rem] text-foreground/80 font-mono bg-background/50 px-2 py-1 rounded">
                                  {ev}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[0.75rem] text-muted-foreground">Confidence</p>
                            <p className="text-[0.75rem] text-foreground font-medium">{error.confidence}%</p>
                          </div>
                          <div className="w-full h-2.5 skeu-progress-track overflow-hidden">
                            <motion.div
                              className="h-full bg-primary skeu-progress-fill"
                              initial={{ width: 0 }}
                              animate={{ width: `${error.confidence}%` }}
                              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

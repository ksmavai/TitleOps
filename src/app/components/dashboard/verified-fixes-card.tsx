import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Link2, ExternalLink, Loader2 } from "lucide-react";
import { usePipeline } from "../../contexts/pipeline-context";

export function VerifiedFixesCard() {
  const { stage, fixes, analysis, isLoading, runResearch } = usePipeline();
  const [expandedFix, setExpandedFix] = useState<number | null>(null);

  // Auto-run research when analysis is done and we're in the researching stage
  useEffect(() => {
    if (analysis && stage === "researching" && fixes.length === 0 && !isLoading) {
      runResearch();
    }
  }, [analysis, stage, fixes.length, isLoading, runResearch]);

  // Auto-expand first fix when results arrive
  useEffect(() => {
    if (fixes.length > 0) setExpandedFix(0);
  }, [fixes]);

  // Loading state
  if (stage === "researching" && isLoading) {
    return (
      <div className="skeu-card p-6">
        <div className="flex items-center justify-between mb-4 relative z-[1]">
          <h2 className="text-[0.875rem] font-semibold text-foreground flex items-center gap-2">
            <span>&#128295;</span>
            <span>Verified Fixes</span>
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3 relative z-[1]">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-[0.8125rem] text-muted-foreground">Searching for verified fixes...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (fixes.length === 0) {
    return (
      <div className="skeu-card p-6">
        <div className="flex items-center justify-between mb-4 relative z-[1]">
          <h2 className="text-[0.875rem] font-semibold text-foreground flex items-center gap-2">
            <span>&#128295;</span>
            <span>Verified Fixes</span>
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-2 relative z-[1]">
          <p className="text-[0.8125rem] text-muted-foreground">No fixes available</p>
          <p className="text-[0.6875rem] text-muted-foreground/60">Fixes will appear after analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="skeu-card p-6">
      <div className="flex items-center justify-between mb-4 relative z-[1]">
        <h2 className="text-[0.875rem] font-semibold text-foreground flex items-center gap-2">
          <span>&#128295;</span>
          <span>Verified Fixes</span>
        </h2>
      </div>

      <div className="space-y-3 relative z-[1]">
        {fixes.map((fix, idx) => {
          const isExpanded = expandedFix === idx;
          return (
            <div key={idx} className="skeu-inset overflow-hidden">
              <button
                onClick={() => setExpandedFix(isExpanded ? null : idx)}
                className="w-full flex items-center justify-between p-4 hover:bg-background/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </motion.div>
                  <span className="text-[0.8125rem] text-foreground">Fix {idx + 1}: {fix.title}</span>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key={`fix-detail-${idx}`}
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
                        <div className="skeu-gauge p-3 overflow-x-auto bg-code-bg">
                          <pre className="text-[0.75rem] text-success" style={{ fontFamily: 'var(--font-family-mono)' }}>
                            {fix.command}
                          </pre>
                        </div>

                        <div className="flex items-center gap-2 text-[0.75rem]">
                          <Link2 className="w-3 h-3 text-primary" />
                          {fix.source.startsWith("http") ? (
                            <a href={fix.source} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              {fix.source}
                            </a>
                          ) : (
                            <span className="text-primary">{fix.source}</span>
                          )}
                          <span className={`
                            px-2 py-0.5 skeu-badge text-[0.75rem] font-medium
                            ${fix.source_type === 'external'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-success/10 text-success'}
                          `}>
                            {fix.source_type}
                          </span>
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

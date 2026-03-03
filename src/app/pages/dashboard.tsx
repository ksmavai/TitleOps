import { TelemetryPanel } from "../components/dashboard/telemetry-panel";
import { SystemHealthOverview } from "../components/dashboard/system-health-overview";
import { PostMortemDraftsArea } from "../components/dashboard/post-mortem-drafts-area";
import { ErrorAnalysisCard } from "../components/dashboard/error-analysis-card";
import { VerifiedFixesCard } from "../components/dashboard/verified-fixes-card";
import { ActionsPanel } from "../components/dashboard/actions-panel";
import { PageTransition } from "../components/page-transition";

export function Dashboard() {
  return (
    <PageTransition>
      <div className="h-full p-6 flex gap-6 dashboard-bg-deco overflow-hidden">
        {/* Left Column - ~60% */}
        <div className="flex-[6] flex flex-col gap-6 overflow-auto min-w-0 relative z-[1]">
          <TelemetryPanel />
          <SystemHealthOverview />
          <PostMortemDraftsArea />
        </div>
        
        {/* Right Column - ~40% */}
        <div className="flex-[4] flex flex-col gap-6 overflow-auto min-w-0 relative z-[1]">
          <ErrorAnalysisCard />
          <VerifiedFixesCard />
          <ActionsPanel />
        </div>
      </div>
    </PageTransition>
  );
}
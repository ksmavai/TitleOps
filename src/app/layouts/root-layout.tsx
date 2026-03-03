import { useState } from "react";
import { Outlet } from "react-router";
import { AppSidebar } from "../components/app-sidebar";
import { AppHeader } from "../components/app-header";
import { AIChatPanel } from "../components/ai-chat-panel";
import { PipelineProvider } from "../contexts/pipeline-context";
import { SidebarProvider } from "../contexts/sidebar-context";

export function RootLayout() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <PipelineProvider>
      <SidebarProvider>
        <div className="flex flex-nowrap h-screen w-full bg-background overflow-hidden relative">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0 h-full">
            <AppHeader
              onToggleChat={() => setChatOpen((prev) => !prev)}
              isChatOpen={chatOpen}
            />
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
          <AIChatPanel
            isOpen={chatOpen}
            onClose={() => setChatOpen(false)}
          />
        </div>
      </SidebarProvider>
    </PipelineProvider>
  );
}

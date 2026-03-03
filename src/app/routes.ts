import { createBrowserRouter } from "react-router";
import { RootLayout } from "./layouts/root-layout";
import { Dashboard } from "./pages/dashboard";
import { PostMortemDrafts } from "./pages/post-mortem-drafts";
import { Integrations } from "./pages/integrations";
import { Settings } from "./pages/settings";
import { Simulations } from "./pages/simulations";
import { AgentStudio } from "./pages/agent-studio";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "simulations", Component: Simulations },
      { path: "post-mortem", Component: PostMortemDrafts },
      { path: "agent-studio", Component: AgentStudio },
      { path: "integrations", Component: Integrations },
      { path: "settings", Component: Settings },
    ],
  },
]);

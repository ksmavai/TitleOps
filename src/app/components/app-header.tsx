import { Moon, Sun, Sparkles, PanelLeft, PanelLeftClose } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "../contexts/theme-context";
import { useSidebar } from "../contexts/sidebar-context";
import { useLocation } from "react-router";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/simulations": "Simulations",
  "/post-mortem": "Post-Mortem Editor",
  "/integrations": "Integrations",
  "/settings": "Settings",
};

interface AppHeaderProps {
  onToggleChat: () => void;
  isChatOpen: boolean;
}

export function AppHeader({ onToggleChat, isChatOpen }: AppHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { collapsed, toggleSidebar } = useSidebar();
  const location = useLocation();

  const title = pageTitles[location.pathname] || "Dashboard";

  return (
    <header className="h-14 skeu-header flex items-center justify-between px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="skeu-icon-btn p-2 text-muted-foreground hover:text-foreground md:hidden"
          aria-label="Toggle sidebar"
        >
          {collapsed ? (
            <PanelLeft className="w-5 h-5" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>
        <AnimatePresence mode="wait">
          <motion.h1
            key={title}
            className="text-[1.125rem] font-semibold text-foreground"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {title}
          </motion.h1>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="skeu-icon-btn p-2 relative overflow-hidden w-9 h-9 flex items-center justify-center"
          aria-label="Toggle theme"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={theme}
              initial={{ rotate: -60, scale: 0.5, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 60, scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-muted-foreground" />
              ) : (
                <Moon className="w-5 h-5 text-muted-foreground" />
              )}
            </motion.div>
          </AnimatePresence>
        </button>

        {/* AI Chat Button */}
        <motion.button
          onClick={onToggleChat}
          className={`
            skeu-icon-btn p-2 relative overflow-hidden w-9 h-9 flex items-center justify-center
            ${isChatOpen ? "ring-2 ring-violet-500/30 bg-violet-500/10" : ""}
          `}
          aria-label="Toggle AI Assistant"
          whileTap={{ scale: 0.9 }}
        >
          <Sparkles className={`w-5 h-5 ${isChatOpen ? "text-violet-500" : "text-muted-foreground"}`} />
          {/* Pulse dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 shadow-sm" />
        </motion.button>

        <div className="skeu-avatar w-8 h-8 bg-primary flex items-center justify-center">
          <span className="text-sm font-semibold text-white">K</span>
        </div>
      </div>
    </header>
  );
}
import { Link, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Radio, FileText, Puzzle, Settings, Zap, PanelLeftClose, PanelLeft, Bot } from "lucide-react";
import { useSidebar } from "../contexts/sidebar-context";

export function AppSidebar() {
  const location = useLocation();
  const { collapsed, toggleSidebar } = useSidebar();

  const navItems = [
    { path: "/", label: "Dashboard", icon: Radio },
    { path: "/simulations", label: "Simulations", icon: Zap },
    { path: "/post-mortem", label: "Post-Mortem Drafts", icon: FileText },
    { path: "/agent-studio", label: "Agent Studio", icon: Bot },
    { path: "/integrations", label: "Integrations", icon: Puzzle },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <motion.aside
      className="skeu-sidebar flex flex-col flex-shrink-0 overflow-hidden relative z-20 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]"
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ willChange: "width" }}
    >
      {/* Logo */}
      <div className={`h-14 flex items-center border-b border-border/50 relative overflow-hidden flex-shrink-0 ${collapsed ? "justify-center px-0" : "px-4"}`}>
        <div className={`flex items-center gap-2 transition-opacity duration-200 ${collapsed ? "opacity-0 absolute" : "opacity-100 relative"}`}>
          <div className="skeu-avatar w-7 h-7 bg-primary flex items-center justify-center flex-shrink-0">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground whitespace-nowrap">
            TitleOps
          </span>
        </div>

        <div className={`transition-all duration-300 ${collapsed ? "relative" : "absolute right-3.5"}`}>
          <button
            onClick={toggleSidebar}
            className="skeu-icon-btn p-1.5 text-muted-foreground hover:text-foreground flex-shrink-0 hover:opacity-100 transition-opacity flex items-center justify-center"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 skeu-nav-item relative
                    ${collapsed ? "justify-center" : ""}
                    ${active ? "text-foreground" : "text-muted-foreground"}
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute inset-0 skeu-nav-active rounded-[10px]"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 32,
                      }}
                    />
                  )}
                  <Icon className="w-4 h-4 flex-shrink-0 relative z-[1]" />
                  <div className={`overflow-hidden transition-all duration-200 ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100 ml-1"}`}>
                    <span className="text-[0.8125rem] relative z-[1] whitespace-nowrap">
                      {item.label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border/50">
        <div className={`flex items-center gap-2 text-[0.75rem] text-muted-foreground ${collapsed ? "justify-center" : ""}`}>
          <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
          <div className={`overflow-hidden transition-all duration-200 ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100 ml-1"}`}>
            <span className="whitespace-nowrap">
              Connected to Datadog
            </span>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}

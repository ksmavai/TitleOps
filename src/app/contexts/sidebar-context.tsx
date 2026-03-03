/**
 * Sidebar Context — Manages the collapsible left sidebar state.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface SidebarState {
    collapsed: boolean;
    toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarState | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);

    const toggleSidebar = useCallback(() => {
        setCollapsed((prev) => !prev);
    }, []);

    return (
        <SidebarContext.Provider value={{ collapsed, toggleSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const ctx = useContext(SidebarContext);
    if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
    return ctx;
}

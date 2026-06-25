import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarCtx {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
}

const Ctx = createContext<SidebarCtx | null>(null);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("kpi_sidebar_collapsed") === "1"; } catch { return false; }
  });
  const toggle = () => setCollapsed((c) => {
    const next = !c;
    try { localStorage.setItem("kpi_sidebar_collapsed", next ? "1" : "0"); } catch {}
    return next;
  });
  return <Ctx.Provider value={{ collapsed, toggle, setCollapsed }}>{children}</Ctx.Provider>;
};

export const useAppSidebar = () => {
  const ctx = useContext(Ctx);
  if (!ctx) return { collapsed: false, toggle: () => {}, setCollapsed: () => {} };
  return ctx;
};

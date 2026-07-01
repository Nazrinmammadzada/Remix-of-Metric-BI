import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, BarChart3, Link2, Settings, ClipboardCheck, Calculator, ShieldCheck, Building2, ClipboardList, Shield, ChevronLeft, ChevronRight, DollarSign, Gauge, SlidersHorizontal, Workflow, GitBranch, Target } from "lucide-react";

import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSidebar } from "@/contexts/SidebarContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { path: "/hr", label: "Əsas Səhifə", icon: Home },
  { path: "/teskilati-struktur", label: "Təşkilat", icon: Building2 },
  { path: "/kpi-kartlari", label: "KPİ-lar", icon: LayoutGrid },
  { path: "/hedef-tayin-izleme", label: "Hədəf təyinlərinin izlənilməsi", icon: Target },
  { path: "/kpi-lifecycle", label: "KPI lifecycle izlənilmələri", icon: Workflow },
  { path: "/kpi-qiymetleri", label: "KPI Nəticələri", icon: Gauge },
  { path: "/qiymetlendirme", label: "Qiymətləndirmə", icon: ClipboardCheck },
  { path: "/kpi-set", label: "KPI Set", icon: SlidersHorizontal },
  { path: "/cascading", label: "Cascading", icon: GitBranch },
  { path: "/tesdiqleme-matrisi", label: "Təsdiqləmə Matrisi", icon: ShieldCheck },
  { path: "/hesabat", label: "Hesabatlar", icon: BarChart3 },
  { path: "/whistleblower", label: "Anonim Bildiriş", icon: Shield },
  { path: "/hesablama-dusturlari", label: "Hesablama Düsturları", icon: Calculator },
  { path: "/bonus", label: "Bonuslar", icon: DollarSign },
  { path: "/inteqrasiyalar", label: "İnteqrasiyalar", icon: Link2 },
  { path: "/ayarlar", label: "Sazlamalar", icon: Settings },
];

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { collapsed, toggle } = useAppSidebar();


  return (
    <TooltipProvider delayDuration={150}>
      <aside
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-sidebar-bg to-sidebar-hover flex flex-col z-50 shadow-xl transition-[width] duration-300 ease-in-out ${
          collapsed ? "w-[68px]" : "w-[210px]"
        }`}
      >
        <div className={`p-4 flex items-center gap-3 border-b border-sidebar-fg/10 ${collapsed ? "justify-center" : ""}`}>
          <img src={logo} alt="Metric BI logo" className="w-9 h-9 object-contain shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-sidebar-fg tracking-wide truncate">Metric BI</h1>
              <p className="text-[11px] text-sidebar-fg/60 truncate">HR Panel</p>
            </div>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Sidebar aç" : "Sidebar bağla"}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-secondary transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-foreground" /> : <ChevronLeft className="w-3.5 h-3.5 text-foreground" />}
        </button>

        <nav className={`flex-1 ${collapsed ? "px-2" : "px-3"} mt-4 space-y-1 overflow-y-auto scrollbar-hide`}>
          {navItems.filter(item => {
            // Yol-> səlahiyyət uyğunluğu. Səlahiyyəti olmayanlar üçün modulu gizlət.
            const pathToPerm: Record<string, string> = {
              "/hr": "home",
              "/teskilati-struktur": "organization",
              "/kpi-kartlari": "kpi",
              "/kpi-qiymetleri": "kpi_scores",
              "/kpi-set": "kpi_set",
              "/hedef-tayin-izleme": "goal_tracking",
              "/kpi-lifecycle": "kpi_lifecycle",
              "/cascading": "cascading",
              "/cascade-matrisi": "cascade_matrix",

              "/komandalar": "teams",
              "/qiymetlendirme": "evaluation",
              "/sistem-tesdiq": "approvals",
              "/tesdiqleme-matrisi": "matrix",
              "/hesabat": "reporting",
              "/whistleblower": "whistleblower",
              "/bonus": "bonus",
              "/hesablama-dusturlari": "formulas",
              "/emekhaqqi-bazasi": "salary",
              "/inteqrasiyalar": "integrations",
              "/ayarlar": "settings",
            };
            const perm = pathToPerm[item.path];
            if (!perm) return true;
            return user?.permissions.includes(perm) ?? false;
          }).map((item) => {
            const isActive = location.pathname === item.path;
            const link = (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-3"} py-2.5 rounded-lg text-sm transition-all relative ${
                  isActive
                    ? "bg-sidebar-active text-sidebar-fg font-medium shadow-sm"
                    : "text-sidebar-fg/70 hover:bg-sidebar-hover hover:text-sidebar-fg"
                }`}
              >
                {isActive && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-foreground rounded-r-full" />}
                <item.icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? '' : 'group-hover:scale-110'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : link;
          })}
        </nav>

        <div className={`p-3 border-t border-sidebar-fg/10 ${collapsed ? "px-2" : ""}`}>
          {!collapsed && (
            <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg bg-sidebar-fg/5">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold shadow-sm shrink-0">
                {user?.avatar}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-sidebar-fg truncate">{user?.name}</p>
                <p className="text-[10px] text-sidebar-fg/50">{user?.role}</p>
              </div>
            </div>
          )}
          {!collapsed && (
            <div className="mt-2 pt-2 border-t border-sidebar-fg/10 text-center">
              <p className="text-[10px] text-sidebar-fg/40">© Blink-bi.az bütün hüquqları qorunur</p>
            </div>
          )}
        </div>

      </aside>
    </TooltipProvider>
  );
};

export default Sidebar;

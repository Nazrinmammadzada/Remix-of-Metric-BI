// KPI accordion list — bütün rollar (HR / Rəhbər / İstifadəçi) üçün eyni
// KPI İzlənməsi görünüşü.
import { useState } from "react";
import { CalendarDays, Flag, ChevronDown, MoreVertical, Eye, LineChart, MessageSquare, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { withKartSuffix } from "@/lib/utils";

export type AccordionKpiStatus = "in_progress" | "at_risk" | "completed" | "delayed";
export type AccordionAction = "view" | "history" | "comments" | "reminders";

export interface AccordionTarget {
  id: string;
  name: string;
  plan: number | string;
  fakt: number | string;
  unit?: string;
  status?: AccordionKpiStatus;
}

export interface AccordionKpi {
  id: string | number;
  name: string;
  createdAt: string;
  deadline: string;
  status: AccordionKpiStatus;
  targets: AccordionTarget[];
}

const STATUS: Record<AccordionKpiStatus, { label: string; cls: string; bar: string }> = {
  in_progress: { label: "İcradadır", cls: "bg-amber-100 text-amber-700 hover:bg-amber-100 border border-amber-200", bar: "bg-blue-500" },
  at_risk:     { label: "Riskdə",    cls: "bg-rose-100 text-rose-700 hover:bg-rose-100 border border-rose-200",   bar: "bg-rose-500" },
  completed:   { label: "Tamamlandı",cls: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200", bar: "bg-emerald-500" },
  delayed:     { label: "Gecikir",   cls: "bg-rose-100 text-rose-700 hover:bg-rose-100 border border-rose-200",   bar: "bg-slate-400" },
};

const toNumber = (v: number | string): number => {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};
const fmt = (v: number | string): string => {
  const n = toNumber(v);
  if (!n && v !== 0 && v !== "0") return String(v);
  return new Intl.NumberFormat("az-AZ").format(n);
};
const pctOf = (plan: number | string, fakt: number | string): number => {
  const p = toNumber(plan); const f = toNumber(fakt);
  return p ? Math.round((f / p) * 100) : 0;
};
const inferStatus = (p: number): AccordionKpiStatus => {
  if (p >= 100) return "completed";
  if (p >= 70) return "in_progress";
  if (p >= 40) return "at_risk";
  return "delayed";
};

interface Props {
  items: AccordionKpi[];
  defaultExpandFirst?: boolean;
  emptyLabel?: string;
  /** 3-nöqtə menyusu üçün handler. Verilməzsə menyu göstərilmir. */
  onAction?: (kpi: AccordionKpi, target: AccordionTarget | null, action: AccordionAction) => void;
}

const ActionsMenu = ({ onSelect }: { onSelect: (a: AccordionAction) => void }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Əməliyyatlar"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
      <DropdownMenuItem onSelect={() => onSelect("view")}><Eye className="w-4 h-4 mr-2" />KPI-yə bax</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onSelect("history")}><LineChart className="w-4 h-4 mr-2" />İcra tarixçəsi</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onSelect("comments")}><MessageSquare className="w-4 h-4 mr-2" />Şərhlər</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onSelect("reminders")}><Bell className="w-4 h-4 mr-2" />Xatırlatmalar</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const KpiAccordionList = ({ items, defaultExpandFirst = true, emptyLabel = "KPI tapılmadı.", onAction }: Props) => {
  const [openIds, setOpenIds] = useState<Set<string | number>>(() => {
    const s = new Set<string | number>();
    if (defaultExpandFirst && items[0]) s.add(items[0].id);
    return s;
  });

  const toggle = (id: string | number) => setOpenIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (items.length === 0) {
    return <div className="bg-card rounded-2xl border border-border p-12 text-center text-sm text-muted-foreground">{emptyLabel}</div>;
  }

  return (
    <div className="space-y-3">
      {items.map(kpi => {
        const isOpen = openIds.has(kpi.id);
        const st = STATUS[kpi.status];
        const hasTargetsCol = !!onAction;
        return (
          <div key={kpi.id} className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="w-full flex items-center gap-4 p-4 hover:bg-secondary/40 transition-colors">
              <button type="button" onClick={() => toggle(kpi.id)} className="min-w-0 flex-1 text-left">
                <div className="font-semibold text-foreground truncate">{withKartSuffix(kpi.name)}</div>
              </button>
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                <CalendarDays className="w-4 h-4" />
                <div className="leading-tight">
                  <div className="text-[11px] text-muted-foreground">Yaranma tarixi</div>
                  <div className="text-foreground font-medium">{kpi.createdAt || "—"}</div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                <Flag className="w-4 h-4" />
                <div className="leading-tight">
                  <div className="text-[11px] text-muted-foreground">Deadline</div>
                  <div className="text-foreground font-medium">{kpi.deadline || "—"}</div>
                </div>
              </div>
              <Badge className={st.cls}>{st.label}</Badge>
              {onAction && <ActionsMenu onSelect={(a) => onAction(kpi, null, a)} />}
              <button type="button" onClick={() => toggle(kpi.id)} className="shrink-0">
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
            </div>

            {isOpen && (
              <div className="border-t border-border bg-secondary/10">
                {kpi.targets.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Bu KPI üçün hədəf təyin olunmayıb.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="text-left px-6 py-3 font-medium">Hədəflər</th>
                        <th className="text-right px-6 py-3 font-medium w-28">Plan</th>
                        <th className="text-right px-6 py-3 font-medium w-28">Fakt</th>
                        <th className="text-left px-6 py-3 font-medium w-56">İcra %</th>
                        <th className="text-center px-6 py-3 font-medium w-32">Status</th>
                        {hasTargetsCol && <th className="text-right px-6 py-3 font-medium w-20">Əməliyyatlar</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {kpi.targets.map((t, idx) => {
                        const p = pctOf(t.plan, t.fakt);
                        const s = STATUS[t.status || inferStatus(p)];
                        const unit = t.unit ? (t.unit === "AZN" ? " ₼" : ` ${t.unit}`) : "";
                        return (
                          <tr key={t.id} className="border-b border-border last:border-b-0">
                            <td className="px-6 py-3 text-foreground">{idx + 1}. {t.name}</td>
                            <td className="px-6 py-3 text-right tabular-nums text-foreground">{fmt(t.plan)}{unit}</td>
                            <td className="px-6 py-3 text-right tabular-nums text-foreground">{fmt(t.fakt)}{unit}</td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                  <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${Math.min(p, 100)}%` }} />
                                </div>
                                <span className="text-xs font-semibold tabular-nums w-10 text-right">{p}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 text-center">
                              <Badge className={s.cls}>{s.label}</Badge>
                            </td>
                            {hasTargetsCol && (
                              <td className="px-6 py-3 text-right">
                                <ActionsMenu onSelect={(a) => onAction!(kpi, t, a)} />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default KpiAccordionList;

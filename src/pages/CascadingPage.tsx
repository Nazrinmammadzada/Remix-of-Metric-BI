import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import {
  Map as MapIcon, ChevronLeft, ChevronDown, ChevronRight, Crown, AlertTriangle,
  CheckCircle2, User2, Building2, Users,
} from "lucide-react";
import {
  resolveAllCascadeChains,
  validateStarStructure,
  type CascadeNode,
  type StarValidationIssue,
} from "@/lib/starCascadeService";
import { findStructureById, getEmployees, type OrgEmployee, type OrgStructure } from "@/lib/orgStore";

const CascadingPage = ({ onBack }: { onBack?: () => void } = {}) => {
  const [chains, setChains] = useState<CascadeNode[]>(() => resolveAllCascadeChains());
  const [issues, setIssues] = useState<StarValidationIssue[]>(() => validateStarStructure());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    const refresh = () => {
      setChains(resolveAllCascadeChains());
      setIssues(validateStarStructure());
    };
    window.addEventListener("org-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("org-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const stats = useMemo(() => {
    let total = 0, withLeader = 0, missing = 0;
    const walk = (n: CascadeNode) => {
      total++;
      if (n.starHolder) withLeader++;
      if (n.missingStar) missing++;
      n.children.forEach(walk);
    };
    chains.forEach(walk);
    return { total, withLeader, missing };
  }, [chains]);

  const toggle = (id: number) =>
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // Only show "missing" issues — multiple leaders artıq avtomatik bloklanır.
  const missingIssues = issues.filter(i => i.kind === "missing");

  return (
    <div className="min-h-screen">
      <Header title="Cascading" />
      <main className="p-6 pb-24">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-4 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40 text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
        )}
        <PageHero
          badge="Rəhbər rolu"
          icon={MapIcon}
          title="Kaskadlama Xəritəsi"
          subtitle="Hər struktur vahidinin rəhbərini görmək üçün karta klik edin. Rəhbərin tabeliyindəki əməkdaşlar məlumat xarakterli görünür."
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <StatCard label="Struktur vahidi" value={stats.total} tone="neutral" icon={Building2} />
          <StatCard label="Rəhbər təyin edilib" value={stats.withLeader} tone="ok" icon={Crown} />
          <StatCard label="Rəhbər təyin edilməyib" value={stats.missing} tone="danger" icon={AlertTriangle} />
        </div>

        {missingIssues.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="font-medium text-foreground">Rəhbər təyin edilməyən struktur vahidləri ({missingIssues.length})</h3>
            </div>
            <ul className="space-y-1 text-sm">
              {missingIssues.slice(0, 8).map(i => (
                <li key={i.unitId} className="text-muted-foreground">• <span className="text-foreground">{i.path}</span></li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              Rəhbər təyin etmək üçün <b>Təşkilat → Struktur kataloqu → Ştat cədvəli</b>-nə keçin və əməkdaşın yanındakı 👑 düyməsinə klik edin.
            </p>
          </div>
        )}

        {chains.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            Təşkilati struktur boşdur.
          </div>
        ) : (
          <div className="space-y-4">
            {chains.map(root => (
              <TreeCard key={root.unitId} node={root} depth={0} expanded={expanded} onToggle={toggle} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard = ({ label, value, tone, icon: Icon }: { label: string; value: number; tone: "neutral" | "ok" | "danger"; icon: any }) => {
  const cls =
    tone === "ok"     ? "bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/30" :
    tone === "danger" ? "bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/30" :
                        "bg-gradient-to-br from-secondary to-transparent border-border";
  const iconCls =
    tone === "ok"     ? "text-emerald-600 dark:text-emerald-400" :
    tone === "danger" ? "text-red-600 dark:text-red-400" :
                        "text-primary";
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="text-3xl font-bold text-foreground mt-1">{value}</div>
        </div>
        <div className={`w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center ${iconCls}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

// Recursive expandable tree card
const TreeCard = ({
  node, depth, expanded, onToggle,
}: { node: CascadeNode; depth: number; expanded: Set<number>; onToggle: (id: number) => void }) => {
  const isOpen = expanded.has(node.unitId);
  const holder = node.starHolder;
  const hasChildren = node.children.length > 0;

  const state: "ok" | "missing" = node.missingStar ? "missing" : "ok";
  const accent =
    state === "ok" ? "border-border hover:border-indigo-400/60" : "border-red-500/40";
  const stripe =
    state === "ok"
      ? "bg-gradient-to-b from-indigo-500 to-violet-500"
      : "bg-gradient-to-b from-red-500 to-rose-500";

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className={`relative overflow-hidden rounded-2xl border ${accent} bg-card shadow-sm hover:shadow-md transition-all`}>
        <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${stripe}`} />
        <button
          onClick={() => onToggle(node.unitId)}
          className="w-full flex items-center gap-3 p-4 pl-5 text-left"
        >
          <div className="p-1 rounded-md hover:bg-secondary transition-colors">
            {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground truncate">{node.unitName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wide font-medium">{node.unitType}</span>
              {hasChildren && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{node.children.length} alt struktur</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              {state === "missing" ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-red-600 dark:text-red-400 font-medium">Rəhbər təyin edilməyib</span>
                </>
              ) : (
                <>
                  <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span className="text-foreground font-medium">{holder!.firstName} {holder!.lastName}</span>
                  {holder!.positionName && <span className="text-muted-foreground">· {holder!.positionName}</span>}
                </>
              )}
            </div>
          </div>
        </button>

        {isOpen && (
          <div className="border-t border-border bg-gradient-to-b from-secondary/30 to-transparent px-5 py-4 animate-accordion-down">
            <LeaderPanel node={node} />
          </div>
        )}
      </div>

      {isOpen && hasChildren && (
        <div className="mt-3 space-y-3">
          {node.children.map(c => (
            <TreeCard key={c.unitId} node={c} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
};

// Leader detail + subordinates (info only)
const LeaderPanel = ({ node }: { node: CascadeNode }) => {
  const holder = node.starHolder;
  const subordinates = useMemo(() => {
    const unit = findStructureById(node.unitId);
    if (!unit) return [] as OrgEmployee[];
    const employees = getEmployees();
    const collect = (n: OrgStructure, out: OrgEmployee[]) => {
      for (const p of n.positions) for (const s of p.slots) {
        if (s.employeeId == null) continue;
        if (holder && s.employeeId === holder.id) continue;
        const e = employees.find(x => x.id === s.employeeId);
        if (e && e.active && !out.find(o => o.id === e.id)) out.push(e);
      }
      n.children.forEach(c => collect(c, out));
    };
    const out: OrgEmployee[] = [];
    collect(unit, out);
    return out;
  }, [node, holder]);

  if (!holder) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">
        Bu struktur vahidinə rəhbər təyin edilməyib. Kaskadlama dayandırılıb.
        <div className="text-xs text-muted-foreground mt-2">
          Rəhbər təyin etmək üçün <b>Təşkilat → Struktur kataloqu</b> bölməsində əməkdaşın yanındakı 👑 düyməsinə klik edin.
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Leader card */}
      <div className="rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-400 font-semibold mb-3">
          <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-500" /> Rəhbər
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
            {holder.firstName[0]}{holder.lastName[0]}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground truncate">{holder.firstName} {holder.lastName}</div>
            {holder.positionName && <div className="text-xs text-muted-foreground truncate">{holder.positionName}</div>}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Kaskad aktiv
        </div>
      </div>

      {/* Subordinates */}
      <div className="md:col-span-2 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-3">
          <Users className="w-3.5 h-3.5" /> Tabeliyindəki əməkdaşlar
          <span className="ml-auto text-foreground/70 normal-case">{subordinates.length} nəfər</span>
        </div>
        {subordinates.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-6">Tabelikdə əməkdaş yoxdur</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
            {subordinates.map(e => (
              <div key={e.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-2.5 py-2">
                <div className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                  {e.firstName[0]}{e.lastName[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{e.firstName} {e.lastName}</div>
                  {e.positionName && <div className="text-[11px] text-muted-foreground truncate">{e.positionName}</div>}
                </div>
                {e.isStarPerson && (
                  <Crown className="w-3.5 h-3.5 ml-auto text-amber-500 fill-amber-400 shrink-0" />
                )}
                {!e.isStarPerson && (
                  <User2 className="w-3.5 h-3.5 ml-auto text-muted-foreground/50 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CascadingPage;

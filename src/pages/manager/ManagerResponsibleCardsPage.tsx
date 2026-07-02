// Manager · "Məsul olduğum kartlar" — rəhbərin gündəlik iş axını.
// Ayrıca KPI Set / Cascading moduluna keçmədən burada hədəf təyinetməsi və
// kaskadlama bölgüsü aparılır.
import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import {
  LayoutGrid, Search, ChevronDown, ChevronRight, GitBranch, Crown,
  CheckCircle2, Hourglass, Target as TargetIcon, Pencil,
} from "lucide-react";
import { useKpiSet, getIncomingCascadeLoad, type KpiSetEntry } from "@/lib/kpiSetStore";
import {
  useCascadeTree, findRootByGoal, distributedOf, remainingOf,
} from "@/lib/cascadeTreeStore";
import { getEmployees } from "@/lib/orgStore";
import CascadeDistributeDialog from "@/components/kpi/CascadeDistributeDialog";
import AssignGoalDialog from "@/components/kpi/AssignGoalDialog";
import CascadeLoadConfirmDialog from "@/components/kpi/CascadeLoadConfirmDialog";


const fmt = (n: number) =>
  new Intl.NumberFormat("az-AZ").format(Math.round(n * 100) / 100);

const parseNum = (v: string) => parseFloat(String(v).replace(/[^\d.\-]/g, "")) || 0;

interface CardGroup {
  cardId: number;
  cardName: string;
  entries: KpiSetEntry[];
}

const ManagerResponsibleCardsPage = () => {
  const rows = useKpiSet();
  useCascadeTree(); // subscribe for re-renders on cascade updates
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [distribute, setDistribute] = useState<KpiSetEntry | null>(null);
  const [assignEntry, setAssignEntry] = useState<KpiSetEntry | null>(null);
  const [cascadeConfirm, setCascadeConfirm] = useState<{ entry: KpiSetEntry; value: number; unit: string } | null>(null);


  // "Rəhbərə məsul olduğu kartlar" — ownerType === "manager"
  const groups = useMemo<CardGroup[]>(() => {
    const managerRows = rows.filter(r => r.ownerType === "manager");
    const map = new Map<number, CardGroup>();
    for (const r of managerRows) {
      if (!map.has(r.cardId)) map.set(r.cardId, { cardId: r.cardId, cardName: r.cardName, entries: [] });
      map.get(r.cardId)!.entries.push(r);
    }
    const list = Array.from(map.values());
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(g =>
      g.cardName.toLowerCase().includes(s) ||
      g.entries.some(e => e.subKpiName.toLowerCase().includes(s) || e.assigneeName.toLowerCase().includes(s))
    );
  }, [rows, q]);

  const stats = useMemo(() => {
    const total = rows.filter(r => r.ownerType === "manager").length;
    const done = rows.filter(r => r.ownerType === "manager" && r.status === "completed").length;
    const cascadable = rows.filter(r => r.ownerType === "manager" && r.cascadable).length;
    return { total, done, cascadable, cards: groups.length };
  }, [rows, groups]);

  return (
    <div className="min-h-screen">
      <Header title="Məsul olduğum kartlar" />
      <main className="p-6 pb-24">
        <PageHero
          badge="Rəhbər Paneli"
          icon={LayoutGrid}
          title="Məsul olduğum kartlar"
          subtitle="Sizə həvalə olunmuş KPI kartlarını buradan idarə edin — kaskadlanan hədəflər burada bölüşdürülür."
        />

        {/* Stat chips */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat label="Kartlar" value={stats.cards} icon={LayoutGrid} />
          <Stat label="Ümumi hədəflər" value={stats.total} icon={TargetIcon} />
          <Stat label="Tamamlanmış" value={stats.done} icon={CheckCircle2} accent="text-emerald-600" />
          <Stat label="Kaskadlanan" value={stats.cascadable} icon={GitBranch} accent="text-primary" />
        </div>

        {/* Search */}
        <div className="rounded-xl border border-border bg-card p-3 mb-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Kart, hədəf və ya əməkdaş axtar..."
              className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Card groups */}
        <div className="space-y-3">
          {groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
              Sizə həvalə edilmiş kart yoxdur.
            </div>
          ) : groups.map(g => {
            const isOpen = open[g.cardId] ?? true;
            const cascadableCount = g.entries.filter(e => e.cascadable).length;
            const doneCount = g.entries.filter(e => e.status === "completed").length;
            return (
              <div key={g.cardId} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpen(o => ({ ...o, [g.cardId]: !isOpen }))}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <span className="font-medium text-foreground truncate">{g.cardName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full border border-border bg-secondary text-muted-foreground">
                      {g.entries.length} hədəf
                    </span>
                    {cascadableCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-1">
                        <GitBranch className="w-3 h-3" /> {cascadableCount} kaskad
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      {doneCount}/{g.entries.length} hazır
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/30 text-xs text-muted-foreground">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium">Hədəf</th>
                          <th className="text-right px-4 py-2 font-medium">Limit</th>
                          <th className="text-right px-4 py-2 font-medium">Bölüşdürülüb</th>
                          <th className="text-right px-4 py-2 font-medium">Qalıq</th>
                          <th className="text-left px-4 py-2 font-medium">Status</th>
                          <th className="text-right px-4 py-2 font-medium w-32">Əməliyyat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.entries.map(e => {
                          const limit = parseNum(e.target);
                          const emp = e.assigneeId ? getEmployees().find(x => x.id === e.assigneeId) : undefined;
                          const root = emp ? findRootByGoal(e.cardName, e.subKpiName || e.cardName, emp.id) : undefined;
                          const dist = root ? distributedOf(root.id) : 0;
                          const rem = root ? remainingOf(root.id) : limit;
                          return (
                            <tr key={e.id} className="border-t border-border hover:bg-secondary/20">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-foreground">{e.subKpiName || <span className="text-muted-foreground italic">— hədəf adı təyin edilməyib</span>}</span>
                                  {e.cascadable && (
                                    <span title="Cascading aktiv" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-[10px]">
                                      <GitBranch className="w-3 h-3" /> C
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right text-foreground">
                                {limit ? `${fmt(limit)} ${e.unit || ""}` : "—"}
                              </td>
                              <td className="px-4 py-2.5 text-right text-primary">
                                {root ? fmt(dist) : "—"}
                              </td>
                              <td className={`px-4 py-2.5 text-right font-medium ${root && rem === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                                {root ? fmt(rem) : (limit ? fmt(limit) : "—")}
                              </td>
                              <td className="px-4 py-2.5">
                                {e.status === "completed" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                                    <CheckCircle2 className="w-3 h-3" /> Hazır
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                                    <Hourglass className="w-3 h-3" /> Gözləyir
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {e.status === "pending" ? (
                                  <button
                                    onClick={() => setAssignEntry(e)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90"
                                  >
                                    <TargetIcon className="w-3.5 h-3.5" /> Təyin et
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setAssignEntry(e)}
                                    title="Redaktə et"
                                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md border border-border text-xs hover:bg-secondary"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {distribute && (
        <CascadeDistributeDialog
          open={!!distribute}
          onOpenChange={(o) => !o && setDistribute(null)}
          bootstrap={{
            cardName: distribute.cardName,
            goalName: distribute.subKpiName || distribute.cardName,
            unit: distribute.unit,
            assigneeName: distribute.assigneeName,
            assigneeId: distribute.assigneeId,
            limit: parseNum(distribute.target),
          }}
        />
      )}

      <AssignGoalDialog
        open={!!assignEntry}
        onOpenChange={(o) => !o && setAssignEntry(null)}
        entry={assignEntry}
        onSaved={(saved) => {
          const entry = assignEntry;
          setAssignEntry(null);
          if (!entry) return;
          if (saved.cascadable && saved.value > 0) {
            // Yenilənmiş entry göstər — reload from store
            const refreshed = { ...entry, target: String(saved.value), unit: saved.unit, cascadable: true };
            setCascadeConfirm({ entry: refreshed, value: saved.value, unit: saved.unit });
          }
        }}
      />

      {cascadeConfirm && (
        <CascadeLoadConfirmDialog
          open={!!cascadeConfirm}
          onOpenChange={(o) => !o && setCascadeConfirm(null)}
          value={cascadeConfirm.value}
          unit={cascadeConfirm.unit}
          onConfirm={() => {
            setDistribute(cascadeConfirm.entry);
            setCascadeConfirm(null);
          }}
        />
      )}
    </div>
  );
};


const Stat = ({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent?: string }) => (
  <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center ${accent || "text-primary"}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${accent || "text-foreground"}`}>{value}</div>
    </div>
  </div>
);

export default ManagerResponsibleCardsPage;

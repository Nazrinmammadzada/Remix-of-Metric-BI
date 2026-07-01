import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { SlidersHorizontal, Search, Sliders, Hourglass, CheckCircle2, User as UserIcon, Eye, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExportMenu from "@/components/common/ExportMenu";
import ScoreLimitsDialog from "@/components/kpi/ScoreLimitsDialog";
import CascadeDistributeDialog from "@/components/kpi/CascadeDistributeDialog";
import {
  useKpiSet,
  setEntryLimits,
  setEntryDetails,
  clearEntryLimits,
  type KpiSetEntry,
} from "@/lib/kpiSetStore";
import { getAssignmentByEntry } from "@/lib/cascadingStore";

type TabKey = "pending" | "completed";

const KpiSetPage = () => {
  const rows = useKpiSet();
  const [tab, setTab] = useState<TabKey>("pending");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<KpiSetEntry | null>(null);
  const [viewing, setViewing] = useState<KpiSetEntry | null>(null);
  const [cascading, setCascading] = useState<KpiSetEntry | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter(r => r.status === tab)
      .filter(r => !q || r.subKpiName.toLowerCase().includes(q) || r.cardName.toLowerCase().includes(q) || r.assigneeName.toLowerCase().includes(q));
  }, [rows, tab, search]);

  const counts = useMemo(() => ({
    pending: rows.filter(r => r.status === "pending").length,
    completed: rows.filter(r => r.status === "completed").length,
  }), [rows]);

  return (
    <div className="min-h-screen">
      <Header title="KPI Set" />
      <main className="p-6 pb-24">
        <PageHero
          badge="KPI Set"
          icon={SlidersHorizontal}
          title="KPI Set"
          subtitle="Rəhbərə təyin olunmuş və ya HR tərəfindən idarə olunan hədəf-lar üçün qiymət limitlərinin müəyyən edilməsi"
        />

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4">
          {([
            { k: "pending" as TabKey, label: "Gözləyənlər", icon: Hourglass, count: counts.pending },
            { k: "completed" as TabKey, label: "Tamamlanmışlar", icon: CheckCircle2, count: counts.completed },
          ]).map(t => {
            const Active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors ${
                  Active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border hover:bg-secondary/50"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${Active ? "bg-primary-foreground/20" : "bg-secondary text-muted-foreground"}`}>{t.count}</span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Hədəf, kart və ya əməkdaş axtar..."
                className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-72"
              />
            </div>
            <ExportMenu
              size="sm"
              disabled={!filtered.length}
              getData={() => ({
                title: `KPI Set — ${tab === "pending" ? "Gözləyənlər" : "Tamamlanmışlar"}`,
                fileName: `kpi-set-${tab}`,
                headers: ["Hədəf", "KPI Kartı", "Təyinatçı", "Əməkdaş", "Hədəf", "Vahid", "Status"],
                rows: filtered.map(r => [
                  r.subKpiName, r.cardName,
                  r.ownerType === "manager" ? "Rəhbər" : "HR",
                  r.assigneeName, r.target, r.unit,
                  r.status === "completed" ? "Tamamlanıb" : "Gözləyir",
                ]),
              })}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40">
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">KPI Kartı</th>
                  <th className="px-4 py-3 font-medium">Təyinatçı</th>
                  <th className="px-4 py-3 font-medium">Əməkdaş</th>
                  {tab === "completed" && <th className="px-4 py-3 font-medium">Hədəf</th>}
                  {tab === "completed" && <th className="px-4 py-3 font-medium">Hədəf</th>}
                  {tab === "completed" && <th className="px-4 py-3 font-medium">Vahid</th>}
                  <th className="px-4 py-3 font-medium w-48">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={tab === "completed" ? 7 : 4} className="px-4 py-12 text-center text-muted-foreground">Sətir tapılmadı</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.cardName}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${
                        r.ownerType === "manager"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      }`}>
                        {r.ownerType === "manager" ? "Rəhbər" : "HR"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                          {r.assigneeName.split(" ").map(p => p[0]).join("").slice(0, 2)}
                        </div>
                        <span className="text-foreground">{r.assigneeName}</span>
                      </div>
                    </td>
                    {tab === "completed" && <td className="px-4 py-2.5 text-foreground">{r.subKpiName}</td>}
                    {tab === "completed" && <td className="px-4 py-2.5">{r.target}</td>}
                    {tab === "completed" && <td className="px-4 py-2.5 text-muted-foreground">{r.unit}</td>}
                    <td className="px-4 py-2.5">
                      {r.status === "pending" ? (
                        <Button size="sm" onClick={() => setEditing(r)}>
                          <Sliders className="w-3.5 h-3.5 mr-1" /> Hədəf təyin et
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewing(r)}
                            title="Bax"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-border hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Redaktə</Button>
                          {r.cascadable && r.ownerType === "manager" && (
                            <Button size="sm" onClick={() => setCascading(r)} className="gap-1">
                              <GitBranch className="w-3.5 h-3.5" /> Kaskad et
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {editing && (
        <ScoreLimitsDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          mode="edit"
          editMeta={editing.status === "pending" || !editing.subKpiName}
          subKpiName={editing.subKpiName}
          target={editing.target}
          unit={editing.unit}
          initial={editing.limits}
          initialDynamic={editing.dynamicLimits}
          initialCascadable={editing.cascadable}
          weight={editing.weight}
          weightMin={editing.weightMin}
          weightMax={editing.weightMax}
          onSave={(payload) => {
            if (payload.meta) setEntryDetails(editing.id, { ...payload.meta, limits: payload.limits, dynamicLimits: payload.dynamicLimits, weight: payload.weight });
            else {
              setEntryLimits(editing.id, payload.limits);
              if (payload.weight != null || payload.dynamicLimits) setEntryDetails(editing.id, { weight: payload.weight, dynamicLimits: payload.dynamicLimits });
            }
            setEditing(null);
          }}
        />
      )}
      {viewing && (
        <ScoreLimitsDialog
          open={!!viewing}
          onOpenChange={(o) => !o && setViewing(null)}
          mode="view"
          subKpiName={viewing.subKpiName}
          target={viewing.target}
          unit={viewing.unit}
          initial={viewing.limits}
          initialDynamic={viewing.dynamicLimits}
          initialCascadable={viewing.cascadable}
          weight={viewing.weight}
          weightMin={viewing.weightMin}
          weightMax={viewing.weightMax}
          cascadeAssignment={getAssignmentByEntry(viewing.id)}
        />
      )}
      {cascading && (
        <CascadeDistributeDialog
          open={!!cascading}
          onOpenChange={(o) => !o && setCascading(null)}
          bootstrap={{
            cardName: cascading.cardName,
            goalName: cascading.subKpiName || cascading.cardName,
            unit: cascading.unit,
            assigneeName: cascading.assigneeName,
            assigneeId: cascading.assigneeId,
            limit: parseFloat(String(cascading.target).replace(/[^\d.\-]/g, "")) || 0,
          }}
        />
      )}

    </div>
  );
};

export default KpiSetPage;

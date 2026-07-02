// Manager · "Məsul olduğum kartlar" — hub with two big cards:
//  1) Hədəf təyin etmə — assign & cascade goals
//  2) Hədəf qiymətləndirmə — evaluate goals (mirrors user's KPI evaluation)
import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import {
  LayoutGrid, Search, ChevronDown, ChevronRight, GitBranch, ChevronLeft,
  CheckCircle2, Hourglass, Target as TargetIcon, Eye,
  ClipboardList, ClipboardCheck, UserPlus, Clock, Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useKpiSet, getIncomingCascadeLoad, type KpiSetEntry } from "@/lib/kpiSetStore";
import { useCascadeTree } from "@/lib/cascadeTreeStore";
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentEmployeeId } from "@/lib/scope";
import {
  useSubKpis, getKpiCardsFor, calcCompletion, isEvaluated, type SubKpi, type KpiCardInfo,
} from "@/lib/kpiEvaluationStore";
import { KpiEvalDialog } from "@/components/evaluation/KpiEvaluationSection";
import { RatingCircles } from "@/components/evaluation/RatingCircles";
import CascadeDistributeDialog from "@/components/kpi/CascadeDistributeDialog";
import AssignGoalDialog from "@/components/kpi/AssignGoalDialog";
import CascadeLoadConfirmDialog from "@/components/kpi/CascadeLoadConfirmDialog";

const fmt = (n: number) =>
  new Intl.NumberFormat("az-AZ").format(Math.round(n * 100) / 100);
const parseNum = (v: string) => parseFloat(String(v).replace(/[^\d.\-]/g, "")) || 0;

type View = "hub" | "assign" | "evaluate";

interface CardGroup {
  cardId: number;
  cardName: string;
  entries: KpiSetEntry[];
}

const ManagerResponsibleCardsPage = () => {
  const [view, setView] = useState<View>("hub");

  return (
    <div className="min-h-screen">
      <Header title="Məsul olduğum kartlar" />
      <main className="p-6 pb-24">
        {view !== "hub" && (
          <button
            onClick={() => setView("hub")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary"
          >
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
        )}

        {view === "hub" && <HubView onOpen={setView} />}
        {view === "assign" && <AssignView />}
        {view === "evaluate" && <EvaluateView />}
      </main>
    </div>
  );
};

/* ============================== HUB ============================== */
const HubView = ({ onOpen }: { onOpen: (v: View) => void }) => {
  const rows = useKpiSet();
  const { user } = useAuth();
  const meId = getCurrentEmployeeId(user);
  const evalItems = useSubKpis(meId || "");

  const assignCount = useMemo(() => rows.filter(r => r.ownerType === "manager").length, [rows]);
  const evalCount = evalItems.length;

  return (
    <>
      <PageHero
        badge="Rəhbər Paneli"
        icon={LayoutGrid}
        title="Məsul olduğum kartlar"
        subtitle="Hədəflərin təyin edilməsi və qiymətləndirilməsi üçün mərkəzi mühit."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
        <HubCard
          icon={ClipboardList}
          title="Hədəf təyin etmə"
          subtitle="Sizə həvalə olunmuş kartlarda hədəflər təyin edin və kaskadlanan hədəfləri bölüşdürün."
          badge={`${assignCount} hədəf`}
          gradient="from-indigo-500/15 via-indigo-500/5 to-transparent border-indigo-400/40"
          onClick={() => onOpen("assign")}
        />
        <HubCard
          icon={ClipboardCheck}
          title="Hədəf qiymətləndirmə"
          subtitle="Sizə aid KPI kartlarındakı hədəfləri qiymətləndirin və nəticələri qeyd edin."
          badge={`${evalCount} hədəf`}
          gradient="from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-400/40"
          onClick={() => onOpen("evaluate")}
        />
      </div>
    </>
  );
};

const HubCard = ({
  icon: Icon, title, subtitle, badge, gradient, onClick,
}: {
  icon: any; title: string; subtitle: string; badge: string; gradient: string; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`text-left rounded-2xl border bg-gradient-to-br ${gradient} p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all group`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="w-14 h-14 rounded-xl bg-white/70 backdrop-blur border border-white flex items-center justify-center shadow-sm">
        <Icon className="w-7 h-7 text-foreground/80" />
      </div>
      <span className="text-xs px-2.5 py-1 rounded-full bg-white/80 border border-white text-foreground/70 font-medium">
        {badge}
      </span>
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
    <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground/70 group-hover:text-foreground">
      Aç <ChevronRight className="w-4 h-4" />
    </div>
  </button>
);

/* ============================== ASSIGN ============================== */
const AssignView = () => {
  const rows = useKpiSet();
  useCascadeTree();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [distribute, setDistribute] = useState<KpiSetEntry | null>(null);
  const [assignEntry, setAssignEntry] = useState<KpiSetEntry | null>(null);
  const [cascadeConfirm, setCascadeConfirm] = useState<{ entry: KpiSetEntry; value: number; unit: string } | null>(null);

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
      g.entries.some(e => e.subKpiName.toLowerCase().includes(s))
    );
  }, [rows, q]);

  const openAssign = (e: KpiSetEntry) => setAssignEntry(e);

  const totals = useMemo(() => {
    const all = groups.flatMap(g => g.entries);
    return {
      cards: groups.length,
      done: all.filter(e => e.status === "completed").length,
      pending: all.filter(e => e.status !== "completed").length,
    };
  }, [groups]);

  return (
    <>
      <PageHero
        badge="Rəhbər Paneli"
        icon={ClipboardList}
        title="Hədəf təyin etmə"
        subtitle="Sizə həvalə olunmuş KPI kartları — hədəflərinizi təyin edin. Kaskadlanan hədəflər avtomatik bölgüyə açılır."
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <MiniHeaderStat icon={Award} label="Kart" value={totals.cards} accent="text-indigo-600" />
        <MiniHeaderStat icon={CheckCircle2} label="Təyin edilib" value={totals.done} accent="text-emerald-600" />
        <MiniHeaderStat icon={Clock} label="Gözləyir" value={totals.pending} accent="text-amber-600" />
      </div>

      <div className="rounded-xl border border-border bg-card p-3 mb-3 flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Kart və ya hədəf axtar..."
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-3">
        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
            Sizə həvalə edilmiş kart yoxdur.
          </div>
        ) : groups.map(g => {
          const isOpen = open[g.cardId] ?? true;
          const doneInCard = g.entries.filter(e => e.status === "completed").length;
          return (
            <div key={g.cardId} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <button
                onClick={() => setOpen(o => ({ ...o, [g.cardId]: !isOpen }))}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-foreground truncate">{g.cardName}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                    {g.entries.length} hədəf
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {doneInCard}/{g.entries.length} təyin edilib
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Ad</th>
                        <th className="text-left px-4 py-3 font-medium">Növ</th>
                        <th className="text-right px-4 py-3 font-medium">Dəyər</th>
                        <th className="text-center px-4 py-3 font-medium">Çəki</th>
                        <th className="text-right px-4 py-3 font-medium">Əməliyyatlar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.entries.map(e => {
                        const displayName = e.subKpiName || "— hədəf adı təyin edilməyib";
                        const value = e.target ? `${fmt(parseNum(e.target))} ${e.unit || ""}`.trim() : "—";
                        const weight = e.weight ? `${e.weight}%` : "—";
                        const isDone = e.status === "completed";
                        return (
                          <tr key={e.id} className="border-t border-border hover:bg-secondary/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={e.subKpiName ? "text-foreground font-medium" : "text-muted-foreground italic"}>{displayName}</span>
                                {e.cascadable && (
                                  <span title="Cascading aktiv" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-[10px]">
                                    <GitBranch className="w-3 h-3" /> C
                                  </span>
                                )}
                                {isDone && (
                                  <Badge className="bg-zone-green-bg text-zone-green-text hover:bg-zone-green-bg gap-1 text-[10px]">
                                    <CheckCircle2 className="w-3 h-3" /> Təyin edilib
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-foreground">{e.type || "—"}</td>
                            <td className="px-4 py-3 text-right text-foreground tabular-nums">{value}</td>
                            <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">{weight}</td>
                            <td className="px-4 py-3 text-right">
                              <Button
                                size="sm"
                                variant={isDone ? "outline" : "default"}
                                onClick={() => openAssign(e)}
                                className="gap-1"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                {isDone ? "Yenilə" : "Təyin et"}
                              </Button>
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
          // Cascade load pəncərəsi: kartın hədəf dəyəri limit kimi göstərilir.
          const incoming = getIncomingCascadeLoad(entry.assigneeName, entry.cardId);
          const value = saved?.value ?? (incoming?.value ?? parseNum(entry.target));
          const unit = saved?.unit ?? (incoming?.unit ?? entry.unit ?? "");
          const refreshed: KpiSetEntry = {
            ...entry,
            target: String(value),
            unit,
            cascadable: true,
            subKpiName: saved?.entryId ? entry.subKpiName : entry.subKpiName,
          };
          setCascadeConfirm({ entry: refreshed, value, unit });
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
    </>
  );
};

/* ============================== EVALUATE ============================== */
const pctTone = (pct: number) => {
  if (pct >= 100) return "bg-zone-green-bg text-zone-green-text";
  if (pct >= 75) return "bg-zone-yellow-bg text-zone-yellow-text";
  return "bg-zone-red-bg text-zone-red-text";
};

const fmtEval = (n: number) =>
  Number.isInteger(n) ? n.toLocaleString("az-AZ") : n.toLocaleString("az-AZ", { maximumFractionDigits: 2 });

const EvaluateView = () => {
  const { user } = useAuth();
  const meId = getCurrentEmployeeId(user);
  const items = useSubKpis(meId || "");
  const cards = useMemo(() => (meId ? getKpiCardsFor(meId) : []), [meId]);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<SubKpi | null>(null);

  if (!cards.length) {
    return (
      <>
        <PageHero
          badge="Rəhbər Paneli"
          icon={ClipboardCheck}
          title="Hədəf qiymətləndirmə"
          subtitle="Sizə aid KPI kartları və hədəflər burada göstərilir."
        />
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Sizə aid KPI kartı yoxdur.
        </div>
      </>
    );
  }

  const totals = {
    done: items.filter(isEvaluated).length,
    pending: items.filter(k => !isEvaluated(k)).length,
    cards: cards.length,
  };

  return (
    <>
      <PageHero
        badge="Rəhbər Paneli"
        icon={ClipboardCheck}
        title="Hədəf qiymətləndirmə"
        subtitle="Sizə aid KPI kartlarını açın və hər bir hədəf üzrə qiymətləndirmə aparın."
      />

      <div className="grid grid-cols-3 gap-3 mb-4">
        <MiniHeaderStat icon={Award} label="Kart" value={totals.cards} accent="text-indigo-600" />
        <MiniHeaderStat icon={CheckCircle2} label="Qiymətləndirilib" value={totals.done} accent="text-emerald-600" />
        <MiniHeaderStat icon={Clock} label="Gözləyir" value={totals.pending} accent="text-amber-600" />
      </div>

      <div className="space-y-3">
        {cards.map((c: KpiCardInfo) => {
          const cardItems = items.filter(k => k.cardId === c.id);
          const done = cardItems.filter(isEvaluated).length;
          const isOpen = openMap[c.id] ?? true;
          return (
            <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <button
                onClick={() => setOpenMap(o => ({ ...o, [c.id]: !isOpen }))}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <ClipboardCheck className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-foreground truncate">{c.name}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {cardItems.length} hədəf
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{c.period}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {done}/{cardItems.length} qiymətləndirilib
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Hədəf</th>
                        <th className="text-right px-4 py-3 font-medium">Hədəf</th>
                        <th className="text-right px-4 py-3 font-medium">Faktiki</th>
                        <th className="text-right px-4 py-3 font-medium">İcra %</th>
                        <th className="text-center px-4 py-3 font-medium">Çəki</th>
                        <th className="text-center px-4 py-3 font-medium">Yekun bal</th>
                        <th className="text-center px-4 py-3 font-medium">Status</th>
                        <th className="text-right px-4 py-3 font-medium">Əməliyyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cardItems.map(k => {
                        const ev = isEvaluated(k);
                        const pct = calcCompletion(k);
                        return (
                          <tr key={k.id} className="border-t border-border hover:bg-secondary/20">
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">{k.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{k.description}</p>
                            </td>
                            <td className="px-4 py-3 text-right text-foreground tabular-nums">{fmtEval(k.target)} {k.unit}</td>
                            <td className="px-4 py-3 text-right text-foreground tabular-nums">
                              {k.actual !== undefined ? `${fmtEval(k.actual)} ${k.unit}` : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {ev ? (
                                <span className={`inline-flex items-center justify-end px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums ${pctTone(pct)}`}>
                                  {pct.toFixed(0)}%
                                </span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-3 text-center text-muted-foreground tabular-nums">{k.weight}%</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center">
                                {ev ? (
                                  <RatingCircles value={k.evaluatedScore ?? 0} size="sm" readOnly showLabel={false} />
                                ) : <span className="text-muted-foreground text-xs">—</span>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {ev ? (
                                <Badge className="bg-zone-green-bg text-zone-green-text hover:bg-zone-green-bg gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Qiymətləndirilib
                                </Badge>
                              ) : (
                                <Badge className="bg-zone-yellow-bg text-zone-yellow-text hover:bg-zone-yellow-bg gap-1">
                                  <Clock className="w-3 h-3" /> Gözləyir
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button size="sm" variant={ev ? "outline" : "default"} onClick={() => setEditing(k)}>
                                {ev ? "Bax / Düzəliş et" : "Qiymətləndir"}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {cardItems.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">Bu kartda hədəf yoxdur.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && <KpiEvalDialog item={editing} onClose={() => setEditing(null)} />}
    </>
  );
};

const MiniHeaderStat = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: string }) => (
  <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${accent || "text-primary"}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${accent || "text-foreground"}`}>{value}</div>
    </div>
  </div>
);

export default ManagerResponsibleCardsPage;

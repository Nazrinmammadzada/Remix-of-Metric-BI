// Manager · "Məsul olduğum kartlar" — hub with two big cards:
//  1) Hədəf təyin etmə — assign & cascade goals (existing workflow)
//  2) Kartlarım — 3 tabs (Öz / Komanda / Tabeçilikdəki) to track KPI cards
import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import {
  LayoutGrid, Search, ChevronDown, ChevronRight, GitBranch, ChevronLeft,
  CheckCircle2, Hourglass, Target as TargetIcon,
  ClipboardList, FolderKanban, User, Users, Network, Eye,
} from "lucide-react";
import { useKpiSet, getIncomingCascadeLoad, type KpiSetEntry } from "@/lib/kpiSetStore";
import { useCascadeTree } from "@/lib/cascadeTreeStore";
import { useSharedKpiCards, type SharedKpiCard, type SharedKpiStatus } from "@/lib/kpiCardStore";

const STATUS_LABEL_MAP: Record<SharedKpiStatus, string> = {
  natamam: "Natamam",
  tesdiq_gozlenilir: "Təsdiq gözlənilir",
  imtina: "İmtina",
  aktiv: "Aktiv",
};
import { useAuth } from "@/contexts/AuthContext";
import { getCurrentEmployeeId } from "@/lib/scope";
import { getEnrichedEmployee, getDirectReports, getTeamsLedBy } from "@/data/mockExtras";
import CascadeDistributeDialog from "@/components/kpi/CascadeDistributeDialog";
import AssignGoalDialog from "@/components/kpi/AssignGoalDialog";
import CascadeLoadConfirmDialog from "@/components/kpi/CascadeLoadConfirmDialog";

const fmt = (n: number) =>
  new Intl.NumberFormat("az-AZ").format(Math.round(n * 100) / 100);
const parseNum = (v: string) => parseFloat(String(v).replace(/[^\d.\-]/g, "")) || 0;

type View = "hub" | "assign" | "mycards";

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
        {view === "mycards" && <MyCardsView />}
      </main>
    </div>
  );
};

/* ============================== HUB ============================== */
const HubView = ({ onOpen }: { onOpen: (v: View) => void }) => {
  const rows = useKpiSet();
  const cards = useSharedKpiCards();
  const { user } = useAuth();
  const meId = getCurrentEmployeeId(user);

  const assignCount = useMemo(() => rows.filter(r => r.ownerType === "manager").length, [rows]);
  const cardsCount = useMemo(() => {
    if (!meId) return 0;
    const reports = new Set(getDirectReports(meId).map(r => r.id));
    const teams = getTeamsLedBy(meId);
    const teamMembers = new Set(teams.flatMap(t => t.memberIds));
    return cards.filter(c => c.ownerId === meId || reports.has(c.ownerId) || teamMembers.has(c.ownerId)).length;
  }, [cards, meId]);

  return (
    <>
      <PageHero
        badge="Rəhbər Paneli"
        icon={LayoutGrid}
        title="Məsul olduğum kartlar"
        subtitle="Hədəf təyin etmə və kartların izlənilməsi üçün mərkəzi mühit."
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
          icon={FolderKanban}
          title="Kartlarım"
          subtitle="Öz, komanda və tabeçiliyinizdəki KPI kartlarını izləyin."
          badge={`${cardsCount} kart`}
          gradient="from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-400/40"
          onClick={() => onOpen("mycards")}
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
    <>
      <PageHero
        badge="Rəhbər Paneli"
        icon={ClipboardList}
        title="Hədəf təyin etmə"
        subtitle="Sizə həvalə olunmuş KPI kartlarını buradan idarə edin — kaskadlanan hədəflər burada bölüşdürülür."
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Kartlar" value={stats.cards} icon={LayoutGrid} />
        <Stat label="Ümumi hədəflər" value={stats.total} icon={TargetIcon} />
        <Stat label="Tamamlanmış" value={stats.done} icon={CheckCircle2} accent="text-emerald-600" />
        <Stat label="Kaskadlanan" value={stats.cascadable} icon={GitBranch} accent="text-primary" />
      </div>

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
                        <th className="text-left px-4 py-2 font-medium">Hədəfin adı</th>
                        <th className="text-left px-4 py-2 font-medium">Növ</th>
                        <th className="text-right px-4 py-2 font-medium">Dəyər</th>
                        <th className="text-right px-4 py-2 font-medium">Çəki</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.entries.map(e => {
                        const displayName = e.subKpiName || "— hədəf adı təyin edilməyib";
                        const value = e.target ? `${fmt(parseNum(e.target))} ${e.unit || ""}`.trim() : "—";
                        const weight = e.weight ? `${e.weight}%` : "—";
                        return (
                          <tr
                            key={e.id}
                            onClick={() => setAssignEntry(e)}
                            className="border-t border-border hover:bg-secondary/40 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className={e.subKpiName ? "text-foreground" : "text-muted-foreground italic"}>{displayName}</span>
                                {e.cascadable && (
                                  <span title="Cascading aktiv" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-[10px]">
                                    <GitBranch className="w-3 h-3" /> C
                                  </span>
                                )}
                                {e.status === "pending" && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                                    <Hourglass className="w-3 h-3" /> Gözləyir
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-foreground">{e.type || "—"}</td>
                            <td className="px-4 py-2.5 text-right text-foreground">{value}</td>
                            <td className="px-4 py-2.5 text-right text-foreground">{weight}</td>
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
        onSaved={() => {
          const entry = assignEntry;
          setAssignEntry(null);
          if (!entry) return;
          const incoming = getIncomingCascadeLoad(entry.assigneeName, entry.cardId);
          if (incoming) {
            const refreshed = { ...entry, target: String(incoming.value), unit: incoming.unit, cardName: incoming.cardName, cascadable: true };
            setCascadeConfirm({ entry: refreshed, value: incoming.value, unit: incoming.unit });
          } else {
            setCascadeConfirm({ entry: { ...entry, cascadable: true }, value: 0, unit: entry.unit || "" });
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
    </>
  );
};

/* ============================== MY CARDS ============================== */
type CardTab = "own" | "team" | "reports";

const MyCardsView = () => {
  const { user } = useAuth();
  const meId = getCurrentEmployeeId(user);
  const cards = useSharedKpiCards();
  const [tab, setTab] = useState<CardTab>("own");
  const [detail, setDetail] = useState<SharedKpiCard | null>(null);

  const reports = useMemo(() => (meId ? getDirectReports(meId) : []), [meId]);
  const reportIds = useMemo(() => new Set(reports.map(r => r.id)), [reports]);
  const myTeams = useMemo(() => (meId ? getTeamsLedBy(meId) : []), [meId]);
  const teamMemberIds = useMemo(() => {
    const s = new Set<string>();
    myTeams.forEach(t => t.memberIds.forEach(id => { if (id !== meId) s.add(id); }));
    return s;
  }, [myTeams, meId]);

  const own = useMemo(() => cards.filter(c => c.ownerId === meId), [cards, meId]);
  const teamCards = useMemo(() => cards.filter(c => teamMemberIds.has(c.ownerId)), [cards, teamMemberIds]);
  const reportsCards = useMemo(() => cards.filter(c => reportIds.has(c.ownerId) && c.ownerId !== meId), [cards, reportIds, meId]);

  const current = tab === "own" ? own : tab === "team" ? teamCards : reportsCards;

  const tabs: { key: CardTab; label: string; icon: any; count: number; color: string }[] = [
    { key: "own", label: "Öz kartlarım", icon: User, count: own.length, color: "text-indigo-600" },
    { key: "team", label: "Komanda kartları", icon: Users, count: teamCards.length, color: "text-emerald-600" },
    { key: "reports", label: "Tabeçilikdəkilər", icon: Network, count: reportsCards.length, color: "text-amber-600" },
  ];

  return (
    <>
      <PageHero
        badge="Rəhbər Paneli"
        icon={FolderKanban}
        title="Kartlarım"
        subtitle="Öz, komanda və tabeçiliyinizdəki KPI kartlarını izləyin."
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map(t => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-foreground border-border hover:bg-secondary"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "" : t.color}`} />
              <span className="text-sm font-medium">{t.label}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${active ? "bg-white/25" : "bg-secondary"}`}>
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {current.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Bu kateqoriyada kart yoxdur.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {current.map(c => (
            <MyCardTile key={c.id} card={c} onView={() => setDetail(c)} />
          ))}
        </div>
      )}

      <CardDetailDialog card={detail} onClose={() => setDetail(null)} />
    </>
  );
};

const statusStyle = (s: SharedKpiCard["status"]) => {
  switch (s) {
    case "aktiv": return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
    case "tesdiq_gozlenilir": return "bg-amber-500/15 text-amber-800 border-amber-500/30";
    case "imtina": return "bg-rose-500/15 text-rose-700 border-rose-500/30";
    case "legv_olundu": return "bg-slate-500/15 text-slate-700 border-slate-500/30";
    default: return "bg-slate-500/15 text-slate-700 border-slate-500/30";
  }
};

const MyCardTile = ({ card, onView }: { card: SharedKpiCard; onView: () => void }) => {
  const owner = getEnrichedEmployee(card.ownerId);
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-foreground truncate">{card.name}</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${statusStyle(card.status)}`}>
          {STATUS_LABEL_MAP[card.status]}
        </span>
      </div>
      <div className="text-xs text-muted-foreground mb-3">
        {owner?.fullName || "—"} · {card.frequency || "—"}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <MiniStat label="Hədəf" value={card.targets.length} />
        <MiniStat label="Çəki" value={`${card.targets.reduce((s, t) => s + (t.weight || 0), 0)}%`} />
        <MiniStat label="Bal" value={card.scoringSystem || "—"} />
      </div>
      <button
        onClick={onView}
        className="w-full text-xs px-3 py-1.5 rounded-md border border-border bg-white hover:bg-secondary/60 flex items-center justify-center gap-1"
      >
        <Eye className="w-3.5 h-3.5" /> Bax
      </button>
    </div>
  );
};

const MiniStat = ({ label, value }: { label: string; value: any }) => (
  <div className="rounded-lg bg-secondary/40 border border-border py-1.5">
    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    <div className="text-sm font-semibold text-foreground">{value}</div>
  </div>
);

const CardDetailDialog = ({ card, onClose }: { card: SharedKpiCard | null; onClose: () => void }) => {
  if (!card) return null;
  const owner = getEnrichedEmployee(card.ownerId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <div className="text-xs text-muted-foreground">KPI Kartı</div>
            <div className="text-lg font-semibold">{card.name}</div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full border ${statusStyle(card.status)}`}>
            {STATUS_LABEL_MAP[card.status]}
          </span>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto text-sm">
          <div className="grid grid-cols-2 gap-3">
            <Info label="Məsul" value={owner?.fullName || "—"} />
            <Info label="Dövr" value={card.frequency || "—"} />
            <Info label="Bal sistemi" value={card.scoringSystem || "—"} />
            <Info label="Başlama" value={card.startDate || "—"} />
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Hədəflər</div>
            <ul className="space-y-1">
              {card.targets.map(t => (
                <li key={t.id} className="flex justify-between rounded bg-muted/40 px-3 py-2">
                  <span>{t.name || "Hədəf"} <span className="text-muted-foreground">({t.type})</span></span>
                  <span className="text-xs">Çəki: {t.weight}% · Bal: {t.scoreLimit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div><div className="text-muted-foreground text-xs">{label}</div><div className="font-medium">{value}</div></div>
);

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

// User · KPI İzlənməsi — 3 kart: Fərdi KPI-lar / Komanda KPI-ları / Struktur KPI-ları.
// Rəhbər ekranındakı UI/UX ilə eyni görünüş (HubCard, statlar, filter, progress).
// Komanda və Struktur bölmələrində yalnız ümumi info: KPI adı, status, ümumi progress, dövr.
// Digər əməkdaşların fərdi hədəf/nəticə/qiymətləndirmə məlumatları göstərilmir.
import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { withKartSuffix } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSharedKpiCards, type SharedKpiCard, type ExecutionStatus } from "@/lib/kpiCardStore";
import { getCurrentEmployeeId, getVisibleKpiCards } from "@/lib/scope";
import { getEnrichedEmployee, mockTeams, mockStructures } from "@/data/mockExtras";
import {
  Activity, User, Users, Network, ChevronLeft, ChevronRight, Search, Filter,
  LineChart, Check, Clock, Eye, Target as TargetIcon,
} from "lucide-react";

// ---------- helpers ----------
const STATUS_LABEL: Record<SharedKpiCard["status"], string> = {
  natamam: "Natamam",
  tesdiq_gozlenilir: "Təsdiq gözlənilir",
  imtina: "İmtina",
  aktiv: "Aktiv",
};
const STATUS_STYLE: Record<SharedKpiCard["status"], string> = {
  aktiv: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
  tesdiq_gozlenilir: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20",
  imtina: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20",
  natamam: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20",
};
const EXEC_LABEL: Record<ExecutionStatus, string> = {
  baslanmayib: "Başlanmayıb",
  icrada: "İcrada",
  tamamlandi: "Tamamlandı",
  gecikme: "Gecikmə",
};
const EXEC_STYLE: Record<ExecutionStatus, string> = {
  baslanmayib: "bg-muted text-foreground/70",
  icrada: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  tamamlandi: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  gecikme: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

// Ümumi progress: assignee-lərin tamamlanma / icrada nisbətindən.
const overallProgress = (c: SharedKpiCard): number => {
  const ids = c.assigneeIds || [];
  if (!ids.length) return 0;
  let sum = 0;
  ids.forEach(id => {
    const s = c.execution[id] || "baslanmayib";
    if (s === "tamamlandi") sum += 100;
    else if (s === "icrada") sum += 50;
    else if (s === "gecikme") sum += 25;
  });
  return Math.round(sum / ids.length);
};

const periodOf = (c: SharedKpiCard) =>
  c.startDate && c.endDate ? `${c.startDate} — ${c.endDate}` : (c.frequency || "—");

type View = "hub" | "own" | "team" | "structure";

// ============================================================
// Page
// ============================================================
const UserKpiCardsPage = () => {
  const [view, setView] = useState<View>("hub");
  const { user } = useAuth();
  const all = useSharedKpiCards();
  const meId = getCurrentEmployeeId(user);
  const me = getEnrichedEmployee(meId);

  const myTeamIds = me?.teamIds || [];
  const myStructureId = me?.structureId || null;

  const visible = useMemo(() => getVisibleKpiCards(user, all), [user, all]);

  // Ayırma məntiqi:
  //  - Komanda: kartın teamIds-i mənim komandamla kəsişir (kollektiv təyinat)
  //  - Struktur: kartın structureIds-i mənim strukturumla kəsişir və komanda deyil
  //  - Fərdi: assigneeIds-də şəxsən mən varam və komanda/struktur deyil
  const buckets = useMemo(() => {
    const own: SharedKpiCard[] = [];
    const team: SharedKpiCard[] = [];
    const structure: SharedKpiCard[] = [];
    visible.forEach(c => {
      const inTeam = myTeamIds.length > 0 && c.teamIds.some(t => myTeamIds.includes(t));
      const inStruct = !!myStructureId && c.structureIds.includes(myStructureId);
      const personallyAssigned = !!meId && c.assigneeIds.includes(meId);
      if (inTeam) team.push(c);
      else if (inStruct && !personallyAssigned) structure.push(c);
      else if (personallyAssigned || c.ownerId === meId) own.push(c);
    });
    return { own, team, structure };
  }, [visible, myTeamIds, myStructureId, meId]);

  return (
    <div className="min-h-screen">
      <Header title="KPI İzlənməsi" />
      <main className="p-6 pb-24">
        {view !== "hub" && (
          <button
            onClick={() => setView("hub")}
            className="mb-4 inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary"
          >
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
        )}

        {view === "hub" && (
          <>
            <PageHero
              badge="İstifadəçi Paneli"
              icon={Activity}
              title="KPI İzlənməsi"
              subtitle="Fərdi, komanda və struktur KPI-larınızı bir ekrandan izləyin."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-2">
              <HubCard
                icon={User}
                title="Fərdi KPI-lar"
                subtitle="Sizə şəxsən təyin olunmuş hədəflərin tam icrası və nəticələri."
                count={buckets.own.length}
                gradient="from-indigo-500/15 via-indigo-500/5 to-transparent border-indigo-400/40"
                onClick={() => setView("own")}
              />
              <HubCard
                icon={Users}
                title="Komanda KPI-ları"
                subtitle="Komandanıza toplu təyin olunmuş KPI-lar — yalnız ümumi göstəricilər."
                count={buckets.team.length}
                gradient="from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-400/40"
                onClick={() => setView("team")}
              />
              <HubCard
                icon={Network}
                title="Struktur KPI-ları"
                subtitle="Struktur səviyyəsində KPI-lar — yalnız ümumi vəziyyət və progress."
                count={buckets.structure.length}
                gradient="from-amber-500/15 via-amber-500/5 to-transparent border-amber-400/40"
                onClick={() => setView("structure")}
              />
            </div>
          </>
        )}

        {view === "own" && (
          <OwnKpisView data={buckets.own} meId={meId} />
        )}
        {view === "team" && (
          <SummaryKpisView
            title="Komanda KPI-ları"
            subtitle="Toplu təyinatlar — digər əməkdaşların fərdi hədəf və nəticələri gizlədilir."
            icon={Users}
            data={buckets.team}
          />
        )}
        {view === "structure" && (
          <SummaryKpisView
            title="Struktur KPI-ları"
            subtitle="Struktur səviyyəli KPI-lar — yalnız ümumi status və progress."
            icon={Network}
            data={buckets.structure}
          />
        )}
      </main>
    </div>
  );
};

export default UserKpiCardsPage;

// ============================================================
// HubCard (rəhbər hesabı ilə eyni stil)
// ============================================================
const HubCard = ({ icon: Icon, title, subtitle, count, gradient, onClick }: any) => (
  <button
    onClick={onClick}
    className={`text-left rounded-2xl border bg-gradient-to-br ${gradient} p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all group`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="w-14 h-14 rounded-xl bg-white/70 backdrop-blur border border-white flex items-center justify-center shadow-sm">
        <Icon className="w-7 h-7 text-foreground/80" />
      </div>
      <span className="text-xs px-2.5 py-1 rounded-full bg-white/80 border border-white text-foreground/70 font-medium">
        {count}
      </span>
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
    <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground/70 group-hover:text-foreground">
      Aç <ChevronRight className="w-4 h-4" />
    </div>
  </button>
);

const StatCard = ({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "indigo" | "violet" | "green" | "red" }) => {
  const map = {
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    green:  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    red:    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${map}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold text-foreground tabular-nums">{value}</div>
      </div>
    </div>
  );
};

// ============================================================
// FƏRDİ — tam məlumat: hədəflər, statuslar, nəticələr, progress
// ============================================================
const OwnKpisView = ({ data, meId }: { data: SharedKpiCard[]; meId: string | null }) => {
  const [statusF, setStatusF] = useState<string>("all");
  const [periodF, setPeriodF] = useState<string>("all");
  const [q, setQ] = useState("");
  const [openCard, setOpenCard] = useState<SharedKpiCard | null>(null);

  const periods = useMemo(() => Array.from(new Set(data.map(periodOf))), [data]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter(c =>
      (statusF === "all" || c.status === statusF) &&
      (periodF === "all" || periodOf(c) === periodF) &&
      (!s || c.name.toLowerCase().includes(s))
    );
  }, [data, statusF, periodF, q]);

  const stats = useMemo(() => {
    const total = data.length;
    const avg = total ? Math.round(data.reduce((a, c) => a + overallProgress(c), 0) / total) : 0;
    const done = data.filter(c => overallProgress(c) >= 100).length;
    const late = data.filter(c => c.status === "imtina" || Object.values(c.execution).includes("gecikme")).length;
    return { total, avg, done, late };
  }, [data]);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Fərdi KPI-lar</h2>
              <p className="text-sm text-muted-foreground">Sizə təyin olunmuş hədəflərin tam siyahısı və icra vəziyyəti.</p>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border border-primary/20">{data.length} KPI</Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <StatCard icon={Users} label="Ümumi KPI sayı" value={String(stats.total)} tone="indigo" />
          <StatCard icon={LineChart} label="Ortalama icra faizi" value={`${stats.avg}%`} tone="violet" />
          <StatCard icon={Check} label="Tamamlananlar" value={String(stats.done)} tone="green" />
          <StatCard icon={Clock} label="Gecikdirilənlər" value={String(stats.late)} tone="red" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 mb-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground">Status</label>
            <Select value={statusF} onValueChange={setStatusF}>
              <SelectTrigger className="w-44 h-9 mt-0.5"><SelectValue placeholder="Bütün statuslar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün statuslar</SelectItem>
                <SelectItem value="aktiv">Aktiv</SelectItem>
                <SelectItem value="tesdiq_gozlenilir">Təsdiq gözlənilir</SelectItem>
                <SelectItem value="natamam">Natamam</SelectItem>
                <SelectItem value="imtina">İmtina</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Dövr</label>
            <Select value={periodF} onValueChange={setPeriodF}>
              <SelectTrigger className="w-56 h-9 mt-0.5"><SelectValue placeholder="Bütün dövrlər" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün dövrlər</SelectItem>
                {periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Axtarış..."
            className="w-64 pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5"><Filter className="w-3.5 h-3.5" /> Filtrlər</Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">KPI</th>
              <th className="text-left px-4 py-3 font-medium">Dövr</th>
              <th className="text-left px-4 py-3 font-medium w-52">Progress</th>
              <th className="text-center px-4 py-3 font-medium">Mənim statusum</th>
              <th className="text-center px-4 py-3 font-medium">Kart statusu</th>
              <th className="text-right px-4 py-3 font-medium w-24">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => {
              const p = overallProgress(c);
              const my = (meId && c.execution[meId]) || "baslanmayib";
              return (
                <tr key={c.id} className="border-t border-border hover:bg-secondary/20 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{withKartSuffix(c.name)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.targets.length} hədəf · {c.frequency}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{periodOf(c)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(p, 100)} className="h-2 flex-1" />
                      <span className="text-xs tabular-nums font-medium w-9 text-right">{p}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex text-xs px-2 py-1 rounded-md ${EXEC_STYLE[my]}`}>
                      {EXEC_LABEL[my]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={STATUS_STYLE[c.status] + " hover:bg-transparent"}>{STATUS_LABEL[c.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setOpenCard(c)}
                      className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                      aria-label="Bax"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">KPI tapılmadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <OwnKpiDetailDialog card={openCard} meId={meId} onClose={() => setOpenCard(null)} />
    </>
  );
};

// Fərdi KPI detalı — yalnız istifadəçinin öz hədəf və statusları
const OwnKpiDetailDialog = ({ card, meId, onClose }: { card: SharedKpiCard | null; meId: string | null; onClose: () => void }) => {
  if (!card) return null;
  const p = overallProgress(card);
  const my = (meId && card.execution[meId]) || "baslanmayib";
  return (
    <Dialog open onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TargetIcon className="w-4 h-4 text-primary" />
            {withKartSuffix(card.name)}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-background p-4">
            <MetaRow label="Dövr" value={periodOf(card)} />
            <MetaRow label="Tezlik" value={card.frequency || "—"} />
            <MetaRow label="Kart statusu" value={<Badge className={STATUS_STYLE[card.status]}>{STATUS_LABEL[card.status]}</Badge>} />
            <MetaRow label="Mənim statusum" value={<span className={`text-xs px-2 py-1 rounded-md ${EXEC_STYLE[my]}`}>{EXEC_LABEL[my]}</span>} />
            <div className="col-span-2">
              <div className="text-[11px] text-muted-foreground mb-1">Ümumi progress</div>
              <div className="flex items-center gap-2">
                <Progress value={Math.min(p, 100)} className="h-2 flex-1" />
                <span className="text-xs tabular-nums font-medium w-9 text-right">{p}%</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Hədəflər</div>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Ad</th>
                    <th className="text-left px-3 py-2 font-medium">Tip</th>
                    <th className="text-right px-3 py-2 font-medium">Hədəf</th>
                    <th className="text-right px-3 py-2 font-medium">Çəki</th>
                  </tr>
                </thead>
                <tbody>
                  {card.targets.map(t => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-3 py-2">{t.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{t.type}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.targetValue || "—"} {t.unit || ""}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{t.weight}%</td>
                    </tr>
                  ))}
                  {card.targets.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">Hədəf yoxdur.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MetaRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
    <div className="text-sm font-medium text-foreground">{value}</div>
  </div>
);

// ============================================================
// KOMANDA / STRUKTUR — yalnız ümumi məlumatlar
// ============================================================
const SummaryKpisView = ({
  title, subtitle, icon: Icon, data,
}: { title: string; subtitle: string; icon: any; data: SharedKpiCard[] }) => {
  const [statusF, setStatusF] = useState<string>("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter(c =>
      (statusF === "all" || c.status === statusF) &&
      (!s || c.name.toLowerCase().includes(s))
    );
  }, [data, statusF, q]);

  const stats = useMemo(() => {
    const total = data.length;
    const avg = total ? Math.round(data.reduce((a, c) => a + overallProgress(c), 0) / total) : 0;
    const active = data.filter(c => c.status === "aktiv").length;
    const done = data.filter(c => overallProgress(c) >= 100).length;
    return { total, avg, active, done };
  }, [data]);

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border border-primary/20">{data.length} KPI</Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <StatCard icon={Users} label="Ümumi KPI sayı" value={String(stats.total)} tone="indigo" />
          <StatCard icon={LineChart} label="Ortalama progress" value={`${stats.avg}%`} tone="violet" />
          <StatCard icon={Check} label="Aktiv KPI-lar" value={String(stats.active)} tone="green" />
          <StatCard icon={Clock} label="Tamamlananlar" value={String(stats.done)} tone="red" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 mb-3 flex items-center gap-3 flex-wrap">
        <div>
          <label className="text-[11px] text-muted-foreground">Status</label>
          <Select value={statusF} onValueChange={setStatusF}>
            <SelectTrigger className="w-44 h-9 mt-0.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Bütün statuslar</SelectItem>
              <SelectItem value="aktiv">Aktiv</SelectItem>
              <SelectItem value="tesdiq_gozlenilir">Təsdiq gözlənilir</SelectItem>
              <SelectItem value="natamam">Natamam</SelectItem>
              <SelectItem value="imtina">İmtina</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Axtarış..."
            className="w-64 pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">KPI adı</th>
              <th className="text-left px-4 py-3 font-medium">Dövr</th>
              <th className="text-left px-4 py-3 font-medium w-64">Ümumi progress</th>
              <th className="text-center px-4 py-3 font-medium">Ümumi status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => {
              const p = overallProgress(c);
              return (
                <tr key={c.id} className="border-t border-border hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{withKartSuffix(c.name)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.frequency}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{periodOf(c)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(p, 100)} className="h-2 flex-1" />
                      <span className="text-xs tabular-nums font-medium w-9 text-right">{p}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={STATUS_STYLE[c.status] + " hover:bg-transparent"}>{STATUS_LABEL[c.status]}</Badge>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">KPI tapılmadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
        <Filter className="w-3 h-3" />
        Məxfilik: digər əməkdaşların fərdi hədəf, nəticə, qiymətləndirmə və şərh məlumatları bu görünüşdə göstərilmir.
      </p>
    </>
  );
};

// mockTeams / mockStructures import edilir ki, gələcək genişlənmə üçün əlçatan olsun.
void mockTeams; void mockStructures;

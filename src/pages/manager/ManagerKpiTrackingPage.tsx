// Rəhbər · KPI İzlənməsi — 3 kart: Mənim KPI-larım / Komanda KPI-ları / Tabeçilikdəkilərin KPI-ları.
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { getEmployees } from "@/lib/orgStore";
import {
  Activity, User, Users, Network, ChevronLeft, ChevronRight, ChevronDown, Search, Bell, Check, X, Clock,
  MoreVertical, Eye, LineChart, MessageSquare, Filter, Send, Paperclip, AlertTriangle, Building2,
  TrendingUp, TrendingDown, Minus, MapPin, Layers, ShieldAlert, Target as TargetIcon,
} from "lucide-react";

type Stage = "assigned" | "evaluated" | "pending_assign";
type KpiStatus = "in_progress" | "at_risk" | "completed" | "delayed";
interface Kpi {
  id: string; name: string; description: string; period: string;
  target: number; actual: number; unit: string; stage: Stage;
  status: KpiStatus; deadline: string; createdAt: string; updatedAt: string;
  responsible: { name: string; role: string };
  measure: string; type: string; method: string; weight: number;
}
interface Person { id: string; name: string; position: string; parent?: string; level: number; assigned: boolean; stage: Stage; }

const MY_KPIS: Kpi[] = [
  {
    id: "k1", name: "Satış Həcminin Artırılması",
    description: "Satış həcmini ötən rübə müqayisədə artırmaq",
    period: "2025 / 1-ci rüb", target: 500_000, actual: 265_000, unit: "AZN", stage: "assigned",
    status: "at_risk", deadline: "29.05.2025", createdAt: "05.01.2025", updatedAt: "15.05.2025",
    responsible: { name: "Aysel Məmmədova", role: "Satış meneceri" },
    measure: "AZN", type: "Rüblük", method: "Toplam satış həcmi", weight: 30,
  },
  {
    id: "k2", name: "Yeni Müştəri Qazanılması",
    description: "Yeni müştərilərin sayını artırmaq",
    period: "2025 / 1-ci rüb", target: 120, actual: 98, unit: "ədəd", stage: "assigned",
    status: "in_progress", deadline: "29.05.2025", createdAt: "05.01.2025", updatedAt: "12.05.2025",
    responsible: { name: "Rəşad Quliyev", role: "Satış Direktoru" },
    measure: "ədəd", type: "Rüblük", method: "Yeni müqavilə sayı", weight: 25,
  },
  {
    id: "k3", name: "Müştəri Məmnuniyyətinin Artırılması",
    description: "Müştəri məmnuniyyət səviyyəsini yüksəltmək",
    period: "2025 / 1-ci rüb", target: 90, actual: 61, unit: "%", stage: "assigned",
    status: "in_progress", deadline: "28.05.2025", createdAt: "05.01.2025", updatedAt: "10.05.2025",
    responsible: { name: "Günel Əlizadə", role: "HR Direktoru" },
    measure: "%", type: "Rüblük", method: "CSAT anketi", weight: 20,
  },
];

const TEAM_KPIS: Kpi[] = [
  {
    id: "t1", name: "Komanda satış həcmi (toplu)", description: "Bütöv komanda üçün toplam satış",
    period: "Q1 2026", target: 1_500_000, actual: 1_120_000, unit: "AZN", stage: "assigned",
    status: "in_progress", deadline: "30.03.2026", createdAt: "02.01.2026", updatedAt: "20.02.2026",
    responsible: { name: "Rəşad Quliyev", role: "Satış Direktoru" },
    measure: "AZN", type: "Rüblük", method: "Toplu satış", weight: 40,
  },
  {
    id: "t2", name: "Brand kampaniya reach (toplu)", description: "Kampaniyaların çatdığı istifadəçi",
    period: "Q1 2026", target: 500_000, actual: 342_000, unit: "istifadəçi", stage: "assigned",
    status: "in_progress", deadline: "30.03.2026", createdAt: "02.01.2026", updatedAt: "18.02.2026",
    responsible: { name: "Aysel İbrahimova", role: "Marketinq Meneceri" },
    measure: "istifadəçi", type: "Rüblük", method: "Analytics", weight: 30,
  },
  {
    id: "t3", name: "NPS orta bal (toplu)", description: "Komanda üzrə orta NPS",
    period: "Q4 2025", target: 70, actual: 72, unit: "bal", stage: "evaluated",
    status: "completed", deadline: "31.12.2025", createdAt: "01.10.2025", updatedAt: "28.12.2025",
    responsible: { name: "Nigar Hüseynova", role: "CFO" },
    measure: "bal", type: "Rüblük", method: "NPS survey", weight: 30,
  },
];

const HIERARCHY: Person[] = [
  { id: "p1", name: "Kamran Quliyev", position: "Rəqəmsal Marketinq Şöbə Müdiri", level: 1, assigned: true, stage: "assigned" },
  { id: "p2", name: "Aynur Cəfərova",  position: "Brend Şöbə Müdiri",              level: 1, assigned: false, stage: "pending_assign" },
  { id: "p3", name: "Orxan Bayramov",  position: "Marketinq Mütəxəssisi", parent: "p1", level: 2, assigned: true, stage: "assigned" },
  { id: "p4", name: "Aytac Kərimova",  position: "Brend Mütəxəssisi",     parent: "p2", level: 2, assigned: false, stage: "pending_assign" },
  { id: "p5", name: "Tural Məmmədzadə", position: "SEO Mütəxəssisi",       parent: "p1", level: 2, assigned: true, stage: "evaluated" },
  { id: "p6", name: "Nərgiz Əhmədova", position: "Kontent Mütəxəssisi",   parent: "p2", level: 2, assigned: true, stage: "assigned" },
];

const fmt = (n: number) => new Intl.NumberFormat("az-AZ").format(n);
const pctOf = (k: Kpi) => k.target ? Math.round((k.actual / k.target) * 100) : 0;
const tone = (p: number) => p >= 100 ? "bg-zone-green-bg text-zone-green-text" : p >= 75 ? "bg-zone-yellow-bg text-zone-yellow-text" : "bg-zone-red-bg text-zone-red-text";

const statusMeta: Record<KpiStatus, { label: string; cls: string }> = {
  in_progress: { label: "İcradadır", cls: "bg-zone-yellow-bg text-zone-yellow-text hover:bg-zone-yellow-bg" },
  at_risk:     { label: "Riskdə",    cls: "bg-zone-red-bg text-zone-red-text hover:bg-zone-red-bg" },
  completed:   { label: "Tamamlandı", cls: "bg-zone-green-bg text-zone-green-text hover:bg-zone-green-bg" },
  delayed:     { label: "Gecikir",   cls: "bg-zone-red-bg text-zone-red-text hover:bg-zone-red-bg" },
};

type View = "hub" | "own" | "team" | "sub";

const ManagerKpiTrackingPage = () => {
  const [view, setView] = useState<View>("hub");
  return (
    <div className="min-h-screen">
      <Header title="KPI İzlənməsi" />
      <main className="p-6 pb-24">
        {view !== "hub" && (
          <button onClick={() => setView("hub")} className="mb-4 inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary">
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
        )}
        {view === "hub" && (
          <>
            <PageHero badge="Rəhbər Paneli" icon={Activity} title="KPI İzlənməsi" subtitle="Fərdi, komanda və tabeçilik KPI-larını fərqli baxış bucaqlarından izləyin." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
              <HubCard icon={User} title="Mənim KPI-larım" subtitle="Sizə aid fərdi hədəflər və onların icra vəziyyəti." count={MY_KPIS.length} gradient="from-indigo-500/15 via-indigo-500/5 to-transparent border-indigo-400/40" onClick={() => setView("own")} />
              <HubCard icon={Users} title="Komanda KPI-ları" subtitle="Toplu (kollektiv) hədəflər — komanda olaraq eyni nəticə." count={TEAM_KPIS.length} gradient="from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-400/40" onClick={() => setView("team")} />
              <HubCard icon={Network} title="Tabeçiliyimdəkilərin KPI-ları" subtitle="İyerarxik görünüş, mərhələ nəzarəti və gecikmə bildirişləri." count={HIERARCHY.length} gradient="from-amber-500/15 via-amber-500/5 to-transparent border-amber-400/40" onClick={() => setView("sub")} />
            </div>
          </>
        )}
        {view === "own" && <OwnKpisView title="Mənim KPI-larım" subtitle="Sizə aid fərdi hədəflər və onların icra vəziyyəti." data={MY_KPIS} />}
        {view === "team" && <OwnKpisView title="Komanda KPI-ları" subtitle="Toplu (kollektiv) hədəflər — komanda olaraq eyni nəticə." data={TEAM_KPIS} />}
        {view === "sub" && <SubordinatesView />}
      </main>
    </div>
  );
};

const HubCard = ({ icon: Icon, title, subtitle, count, gradient, onClick }: any) => (
  <button onClick={onClick} className={`text-left rounded-2xl border bg-gradient-to-br ${gradient} p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all group`}>
    <div className="flex items-start justify-between mb-4">
      <div className="w-14 h-14 rounded-xl bg-white/70 backdrop-blur border border-white flex items-center justify-center shadow-sm">
        <Icon className="w-7 h-7 text-foreground/80" />
      </div>
      <span className="text-xs px-2.5 py-1 rounded-full bg-white/80 border border-white text-foreground/70 font-medium">{count}</span>
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
    <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground/70 group-hover:text-foreground">Aç <ChevronRight className="w-4 h-4" /></div>
  </button>
);

// ============================================================
// OWN KPIs VIEW — full featured
// ============================================================
type DrawerTab = "info" | "history" | "comments" | "reminders";

interface CommentItem { id: string; author: string; role: string; date: string; text: string; }
interface HistoryItem { id: string; date: string; time: string; author: string; field: string; from: string; to: string; }
interface ReminderItem { id: string; date: string; time: string; author: string; text: string; read: boolean; }

const initialComments = (kpiId: string): CommentItem[] => [
  { id: `${kpiId}-c1`, author: "Aysel Məmmədova", role: "Satış meneceri", date: "15.05.2025 14:35", text: "Aprel ayında artım tempi gözləntilərimizə uyğundur. Davam edirik." },
  { id: `${kpiId}-c2`, author: "Nicat Əliyev",    role: "Satış Direktoru", date: "15.05.2025 14:45", text: "Yaxşı xəbərdir. May ayında kampaniyanın təsiri ilə hədəfə daha da yaxınlaşacağımıza əminəm." },
  { id: `${kpiId}-c3`, author: "Aysel Məmmədova", role: "Satış meneceri", date: "15.05.2025 14:50", text: "May ayı üçün yeni kampaniya planlaşdırılıb." },
];

const initialHistory = (kpiId: string): HistoryItem[] => [
  { id: `${kpiId}-h1`, date: "15.05.2025", time: "14:30", author: "Aysel Məmmədova", field: "İcra faizi", from: "45%", to: "53%" },
  { id: `${kpiId}-h2`, date: "30.04.2025", time: "11:20", author: "Aysel Məmmədova", field: "İcra faizi", from: "28%", to: "45%" },
  { id: `${kpiId}-h3`, date: "15.04.2025", time: "10:15", author: "Aysel Məmmədova", field: "İcra faizi", from: "12%", to: "28%" },
  { id: `${kpiId}-h4`, date: "01.04.2025", time: "09:00", author: "Sistem",           field: "KPI yaradıldı", from: "—", to: "plan təyin edildi" },
];

const initialReminders = (kpiId: string): ReminderItem[] => [
  { id: `${kpiId}-r1`, date: "15.05.2025", time: "10:00", author: "Aysel Məmmədova", text: "KPI icra vəziyyətini yeniləməyi xatırladırıq.", read: true },
  { id: `${kpiId}-r2`, date: "30.04.2025", time: "09:30", author: "Aysel Məmmədova", text: "KPI icra vəziyyətini yeniləməyi xatırladırıq.", read: true },
  { id: `${kpiId}-r3`, date: "15.04.2025", time: "09:15", author: "Aysel Məmmədova", text: "KPI icra vəziyyətini yeniləməyi xatırladırıq.", read: true },
];

const OwnKpisView = ({ title, subtitle, data }: { title: string; subtitle: string; data: Kpi[] }) => {
  const [statusF, setStatusF] = useState<string>("all");
  const [periodF, setPeriodF] = useState<string>("all");
  const [q, setQ] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawerKpi, setDrawerKpi] = useState<Kpi | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("info");

  const periods = useMemo(() => Array.from(new Set(data.map(d => d.period))), [data]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter(k =>
      (statusF === "all" || k.status === statusF) &&
      (periodF === "all" || k.period === periodF) &&
      (!s || k.name.toLowerCase().includes(s))
    );
  }, [data, statusF, periodF, q]);

  const stats = useMemo(() => {
    const total = data.length;
    const avg = total ? Math.round(data.reduce((a, k) => a + pctOf(k), 0) / total) : 0;
    const done = data.filter(k => k.status === "completed" || pctOf(k) >= 100).length;
    const late = data.filter(k => k.status === "delayed" || k.status === "at_risk").length;
    return { total, avg, done, late };
  }, [data]);

  const openDrawer = (k: Kpi, tab: DrawerTab) => {
    setDrawerKpi(k); setDrawerTab(tab); setOpenMenu(null);
  };

  return (
    <>
      {/* Summary */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
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
          <StatCard icon={LineChart} label="Ortalama icra faizi" value={`${stats.avg}%`} tone="violet" />
          <StatCard icon={Check} label="Tamamlananlar" value={String(stats.done)} tone="green" />
          <StatCard icon={Clock} label="Gecikdirilənlər" value={String(stats.late)} tone="red" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-card p-3 mb-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div>
            <label className="text-[11px] text-muted-foreground">Status</label>
            <Select value={statusF} onValueChange={setStatusF}>
              <SelectTrigger className="w-44 h-9 mt-0.5"><SelectValue placeholder="Bütün statuslar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün statuslar</SelectItem>
                <SelectItem value="in_progress">İcradadır</SelectItem>
                <SelectItem value="at_risk">Riskdə</SelectItem>
                <SelectItem value="completed">Tamamlandı</SelectItem>
                <SelectItem value="delayed">Gecikir</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Dövr</label>
            <Select value={periodF} onValueChange={setPeriodF}>
              <SelectTrigger className="w-44 h-9 mt-0.5"><SelectValue placeholder="Bütün dövrlər" /></SelectTrigger>
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
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Axtarış..."
            className="w-64 pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5"><Filter className="w-3.5 h-3.5" /> Filtrlər</Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">KPI</th>
              <th className="text-right px-4 py-3 font-medium">Plan</th>
              <th className="text-right px-4 py-3 font-medium">Fakt</th>
              <th className="text-left px-4 py-3 font-medium w-44">İcra %</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Deadline</th>
              <th className="text-right px-4 py-3 font-medium w-24">Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(k => {
              const p = pctOf(k);
              return (
                <tr key={k.id} className="border-t border-border hover:bg-secondary/20 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{k.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{k.description}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(k.target)} {k.unit === "AZN" ? "₼" : ""}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmt(k.actual)} {k.unit === "AZN" ? "₼" : ""}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(p, 100)} className="h-2 flex-1" />
                      <span className="text-xs tabular-nums font-medium w-9 text-right">{p}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={statusMeta[k.status].cls}>{statusMeta[k.status].label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{k.deadline}</td>
                  <td className="px-4 py-3 text-right">
                    <Popover open={openMenu === k.id} onOpenChange={o => setOpenMenu(o ? k.id : null)}>
                      <PopoverTrigger asChild>
                        <button className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" aria-label="Əməliyyatlar">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-52 p-1">
                        <MenuItem icon={Eye} label="KPI-yə bax" onClick={() => openDrawer(k, "info")} />
                        <MenuItem icon={LineChart} label="İcra tarixçəsi" onClick={() => openDrawer(k, "history")} />
                        <MenuItem icon={MessageSquare} label="Şərhlər" onClick={() => openDrawer(k, "comments")} />
                        <MenuItem icon={Bell} label="Xatırlatmalar" onClick={() => openDrawer(k, "reminders")} />
                      </PopoverContent>
                    </Popover>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">KPI tapılmadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <KpiDrawer kpi={drawerKpi} tab={drawerTab} setTab={setDrawerTab} onClose={() => setDrawerKpi(null)} />
    </>
  );
};

const MenuItem = ({ icon: Icon, label, onClick }: any) => (
  <button onClick={onClick} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm hover:bg-secondary text-foreground focus:outline-none focus:bg-secondary transition-colors">
    <Icon className="w-4 h-4 text-muted-foreground" />
    <span>{label}</span>
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
// DRAWER — no backdrop, right-side, ~440px
// ============================================================
const KpiDrawer = ({ kpi, tab, setTab, onClose }: {
  kpi: Kpi | null; tab: DrawerTab; setTab: (t: DrawerTab) => void; onClose: () => void;
}) => {
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({});
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (kpi && !commentsMap[kpi.id]) {
      setCommentsMap(m => ({ ...m, [kpi.id]: initialComments(kpi.id) }));
    }
  }, [kpi, commentsMap]);

  useEffect(() => {
    if (tab === "comments" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tab, commentsMap, kpi]);

  if (!kpi) return null;
  const p = pctOf(kpi);
  const comments = commentsMap[kpi.id] || [];
  const history = initialHistory(kpi.id);
  const reminders = initialReminders(kpi.id);

  const sendComment = () => {
    const t = draft.trim();
    if (!t) return;
    const now = new Date();
    const stamp = `${String(now.getDate()).padStart(2,"0")}.${String(now.getMonth()+1).padStart(2,"0")}.${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const item: CommentItem = { id: `${kpi.id}-c${Date.now()}`, author: "Siz", role: "İstifadəçi", date: stamp, text: t };
    setCommentsMap(m => ({ ...m, [kpi.id]: [...(m[kpi.id] || []), item] }));
    setDraft("");
    toast({ title: "Şərh göndərildi" });
  };

  return (
    <aside className="fixed top-0 right-0 h-screen w-full sm:w-[440px] bg-card border-l border-border shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">KPI-yə bax</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-md hover:bg-secondary inline-flex items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="p-5">
          {/* Title */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-base font-semibold text-foreground">{kpi.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{kpi.description}</div>
            </div>
            <Badge className={statusMeta[kpi.status].cls}>{statusMeta[kpi.status].label}</Badge>
          </div>

          {/* Card 1 */}
          <div className="rounded-xl border border-border bg-background p-4 mb-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <MetaRow label="Dövr" value={kpi.period} />
            <MetaRow label="Plan" value={`${fmt(kpi.target)} ${kpi.unit === "AZN" ? "₼" : kpi.unit}`} />
            <MetaRow label="Status" value={<span className="text-rose-500">{statusMeta[kpi.status].label}</span>} />
            <MetaRow label="Fakt" value={`${fmt(kpi.actual)} ${kpi.unit === "AZN" ? "₼" : kpi.unit}`} />
            <MetaRow label="Deadline" value={kpi.deadline} />
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">İcra faizi</div>
              <div className="flex items-center gap-2">
                <Progress value={Math.min(p, 100)} className="h-1.5 flex-1" />
                <span className="text-xs font-medium tabular-nums">{p}%</span>
              </div>
            </div>
            <MetaRow label="Məsul rəhbər" value={<span>{kpi.responsible.name}<div className="text-[11px] text-muted-foreground">{kpi.responsible.role}</div></span>} />
            <MetaRow label="Yaradılma" value={kpi.createdAt} />
            <div />
            <MetaRow label="Son yenilənmə" value={kpi.updatedAt} />
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as DrawerTab)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="info">İcra məlumatı</TabsTrigger>
              <TabsTrigger value="history">Tarixçə</TabsTrigger>
              <TabsTrigger value="comments">Şərhlər</TabsTrigger>
              <TabsTrigger value="reminders">Xatırlatmalar</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-3">
              <div className="rounded-xl border border-border p-4 grid grid-cols-2 gap-x-4 gap-y-3">
                <MetaRow label="Ölçü vahidi" value={kpi.measure} />
                <MetaRow label="Hədəf tipi" value={kpi.type} />
                <MetaRow label="Hesablama üsulu" value={kpi.method} />
                <MetaRow label="Çəki" value={`${kpi.weight}%`} />
                <MetaRow label="Cari nəticə" value={`${fmt(kpi.actual)} / ${fmt(kpi.target)}`} />
                <MetaRow label="Qalan hədəf" value={`${fmt(Math.max(kpi.target - kpi.actual, 0))} ${kpi.unit === "AZN" ? "₼" : kpi.unit}`} />
                <MetaRow label="Növbəti icmal" value="05.06.2025" />
                <MetaRow label="Hədəf tipi" value={p >= 100 ? "Tamamlanıb" : "Artan (↑) daha yaxşıdır"} />
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-3">
              <ol className="relative border-l border-border pl-4 space-y-4">
                {history.map(h => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/15" />
                    <div className="text-[11px] text-muted-foreground">{h.date} {h.time}</div>
                    <div className="text-sm font-medium text-foreground">{h.author}</div>
                    <div className="text-xs text-muted-foreground">
                      {h.field}: <span className="text-foreground">{h.from}</span> → <span className="text-primary font-medium">{h.to}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </TabsContent>

            <TabsContent value="comments" className="mt-3">
              <div className="space-y-3">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex-shrink-0 flex items-center justify-center text-xs font-semibold">
                      {c.author.split(" ").map(x => x[0]).join("").slice(0,2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs">
                        <span className="font-medium text-foreground">{c.author}</span>
                        <span className="text-muted-foreground"> · {c.date}</span>
                      </div>
                      <div className="mt-1 text-sm text-foreground rounded-lg bg-secondary/50 border border-border px-3 py-2">{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                <button className="w-8 h-8 rounded-md hover:bg-secondary text-muted-foreground inline-flex items-center justify-center" aria-label="Fayl əlavə et">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                  placeholder="Şərhinizi yazın..."
                  className="flex-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button size="sm" onClick={sendComment} className="gap-1"><Send className="w-3.5 h-3.5" /> Göndər</Button>
              </div>
            </TabsContent>

            <TabsContent value="reminders" className="mt-3">
              <ol className="relative border-l border-border pl-4 space-y-4">
                {reminders.map(r => (
                  <li key={r.id} className="relative">
                    <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ring-4 ${r.read ? "bg-emerald-500 ring-emerald-500/15" : "bg-amber-500 ring-amber-500/15"}`} />
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-muted-foreground">{r.date} {r.time}</div>
                        <div className="text-sm font-medium text-foreground">{r.author}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.text}</div>
                      </div>
                      <Badge className={r.read ? "bg-zone-green-bg text-zone-green-text hover:bg-zone-green-bg" : "bg-zone-yellow-bg text-zone-yellow-text hover:bg-zone-yellow-bg"}>
                        {r.read ? "Oxundu" : "Oxunmayıb"}
                      </Badge>
                    </div>
                  </li>
                ))}
                <li className="text-[11px] text-muted-foreground pl-1">Yalnız rəhbər tərəfindən göndərilən xatırlatmalar göstərilir.</li>
              </ol>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </aside>
  );
};

const MetaRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className="text-sm text-foreground mt-0.5">{value}</div>
  </div>
);

const SubordinatesView = () => {
  const [level, setLevel] = useState(1);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return HIERARCHY.filter(p => p.level <= level && (!s || p.name.toLowerCase().includes(s)));
  }, [level, q]);

  const nudge = (name: string) => {
    toast({ title: "Bildiriş göndərildi", description: `${name} tələsdirildi — hədəfləri təyin etməsi xatırladıldı.` });
  };

  // Enrich with father name from org store when available
  const emps = getEmployees();
  const fatherOf = (name: string) => {
    const parts = name.split(" ");
    const e = emps.find(x => x.firstName === parts[0] && x.lastName === parts.slice(1).join(" "));
    return e?.fatherName ?? "—";
  };

  return (
    <>
      <PageHero badge="Rəhbər Paneli" icon={Network} title="Tabeçiliyimdəkilərin KPI-ları" subtitle="Default: 1-ci səviyyə. Səviyyəni artıraraq daha dərin izləmə edə bilərsiniz." />

      <div className="rounded-xl border border-border bg-card p-3 mb-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Əməkdaş axtar..." className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Səviyyə:
          {[1, 2, 3, 4, 5].map(l => (
            <button key={l} onClick={() => setLevel(l)} className={`w-7 h-7 rounded-md border text-xs font-medium transition-colors ${level === l ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Əməkdaşın A.S.A.</th>
              <th className="text-left px-4 py-3 font-medium">Ata adı</th>
              <th className="text-left px-4 py-3 font-medium">Vəzifə</th>
              <th className="text-center px-4 py-3 font-medium">Səviyyə</th>
              <th className="text-center px-4 py-3 font-medium">Təyin</th>
              <th className="text-center px-4 py-3 font-medium">Mərhələ</th>
              <th className="text-right px-4 py-3 font-medium">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-t border-border hover:bg-secondary/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2" style={{ paddingLeft: `${(p.level - 1) * 16}px` }}>
                    <span className="font-medium text-foreground">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{fatherOf(p.name)}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.position}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">L{p.level}</td>
                <td className="px-4 py-3 text-center">
                  {p.assigned ? <Check className="w-4 h-4 text-emerald-600 inline" /> : <X className="w-4 h-4 text-destructive inline" />}
                </td>
                <td className="px-4 py-3 text-center">
                  {p.stage === "evaluated" ? (
                    <Badge className="bg-zone-green-bg text-zone-green-text hover:bg-zone-green-bg">Qiymətləndirilib</Badge>
                  ) : p.stage === "assigned" ? (
                    <Badge className="bg-zone-yellow-bg text-zone-yellow-text hover:bg-zone-yellow-bg">Təyin edilib</Badge>
                  ) : (
                    <Badge className="bg-zone-red-bg text-zone-red-text hover:bg-zone-red-bg gap-1"><Clock className="w-3 h-3" /> Gecikir</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {!p.assigned && (
                    <Button size="sm" variant="outline" onClick={() => nudge(p.name)} className="gap-1">
                      <Bell className="w-3.5 h-3.5" /> Tələsdür
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Əməkdaş tapılmadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ManagerKpiTrackingPage;

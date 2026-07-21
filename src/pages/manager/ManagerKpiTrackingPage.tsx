// Rəhbər · KPI İzlənməsi — 3 kart: Mənim KPI-larım / Komanda KPI-ları / Tabeçilikdəkilərin KPI-ları.
import { withKartSuffix } from "@/lib/utils";
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
import { getEmployees, getStructures, type OrgStructure } from "@/lib/orgStore";
import { useCascadeTree, type CascadeTreeNode } from "@/lib/cascadeTreeStore";
import { useSharedKpiCards, type SharedKpiCard, type ExecutionStatus } from "@/lib/kpiCardStore";
import { computeReviewStatus, setReviewOutcome, useKpiLifecycles, type CardLifecycle, type LifecycleReview, type ReviewComputedStatus } from "@/lib/kpiLifecycleStore";
import CascadeDistributeDialog from "@/components/kpi/CascadeDistributeDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import KpiScoresPage from "@/pages/KpiScoresPage";
import KpiDetailView from "@/components/kpi/KpiDetailView";
import { REVIEW_STATUS_STYLES } from "@/components/kpi/LifecycleView";
import type { KpiCard as KpiCardShape } from "@/lib/kpiCardTypes";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity, User, Users, Network, ChevronLeft, ChevronRight, ChevronDown, Search, Bell, Check, X, Clock,
  MoreVertical, Eye, LineChart, MessageSquare, Filter, Send, Paperclip, AlertTriangle, Building2,
  TrendingUp, TrendingDown, Minus, MapPin, Layers, ShieldAlert, Target as TargetIcon, GitBranch, RefreshCw,
} from "lucide-react";
import KpiAccordionList, { type AccordionKpi, type AccordionKpiStatus } from "@/components/kpi/KpiAccordionList";
import ReviewOverviewDialog, { type ReviewOverviewData } from "@/components/kpi/ReviewOverviewDialog";
import ReviewStatusChangeDialog, { type ReviewStatusValue } from "@/components/kpi/ReviewStatusChangeDialog";
import PerformanceDynamicsDrilldownTab from "@/components/kpi/PerformanceDynamicsDrilldownTab";

type Stage = "assigned" | "evaluated" | "pending_assign";
type KpiStatus = "in_progress" | "at_risk" | "completed" | "delayed";
interface Kpi {
  id: string; name: string; description: string; period: string;
  target: number; actual: number; unit: string; stage: Stage;
  status: KpiStatus; deadline: string; createdAt: string; updatedAt: string;
  responsible: { name: string; role: string };
  measure: string; type: string; method: string; weight: number;
  cascadeNodeId?: string;
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

// Kart üçün hədəf breakdown-ı — seed və dinamik KPI-lar üçün ortaq adapter.
const SEED_TARGETS: Record<string, { name: string; plan: number; fakt: number; unit: string; status: KpiStatus }[]> = {
  "Satış Həcminin Artırılması": [
    { name: "Yeni müştərilərin sayının artırılması", plan: 120, fakt: 98, unit: "ədəd", status: "in_progress" },
    { name: "Mövcud müştərilərlə satışların artırılması", plan: 250_000, fakt: 120_000, unit: "AZN", status: "at_risk" },
    { name: "Yeni məhsulun satışa çıxarılması", plan: 1, fakt: 0, unit: "ədəd", status: "delayed" },
  ],
  "Yeni Müştəri Qazanılması": [
    { name: "B2B müqavilələr", plan: 70, fakt: 58, unit: "ədəd", status: "in_progress" },
    { name: "B2C müqavilələr", plan: 50, fakt: 40, unit: "ədəd", status: "in_progress" },
  ],
  "Müştəri Məmnuniyyətinin Artırılması": [
    { name: "CSAT anketi orta bal", plan: 90, fakt: 61, unit: "%", status: "in_progress" },
    { name: "Şikayət cavab müddəti (saat)", plan: 24, fakt: 18, unit: "saat", status: "completed" },
  ],
  "Komanda satış həcmi (toplu)": [
    { name: "Aylıq satış — Yanvar", plan: 500_000, fakt: 480_000, unit: "AZN", status: "in_progress" },
    { name: "Aylıq satış — Fevral", plan: 500_000, fakt: 420_000, unit: "AZN", status: "at_risk" },
    { name: "Aylıq satış — Mart", plan: 500_000, fakt: 220_000, unit: "AZN", status: "in_progress" },
  ],
  "Brand kampaniya reach (toplu)": [
    { name: "Sosial media reach", plan: 300_000, fakt: 215_000, unit: "istifadəçi", status: "in_progress" },
    { name: "Web reach", plan: 200_000, fakt: 127_000, unit: "istifadəçi", status: "in_progress" },
  ],
  "NPS orta bal (toplu)": [
    { name: "Komanda üzrə orta NPS", plan: 70, fakt: 72, unit: "bal", status: "completed" },
  ],
};

const targetsForKpi = (k: Kpi) => {
  const key = k.name.replace(/\s+—.*$/, "");
  const seed = SEED_TARGETS[key];
  if (seed) return seed.map((t, i) => ({ id: `${k.id}-t${i + 1}`, ...t }));
  return [{
    id: `${k.id}-t1`,
    name: k.method || k.name,
    plan: k.target,
    fakt: k.actual,
    unit: k.unit,
    status: k.status as AccordionKpiStatus,
  }];
};


type View = "hub" | "own" | "team" | "sub" | "reviews";

const ManagerKpiTrackingPage = () => {
  const [view, setView] = useState<View>("hub");
  const { user } = useAuth();
  const tree = useCascadeTree();
  const sharedCards = useSharedKpiCards();

  // Cari istifadəçiyə cascade və Owner-tipli SharedKpiCard-lardan yaranan dinamik KPI-lar
  const dynamicMyKpis = useMemo<Kpi[]>(() => {
    if (!user?.name) return [];
    const result: Kpi[] = [];
    // 1) Cascade tree node-ları (yuxarıdan pay alınmış hədəflər)
    tree.filter(n => n.assigneeName === user.name).forEach(n => {
      result.push({
        id: `ct-${n.id}`,
        name: `${withKartSuffix(n.cardName)} — ${n.goalName || "Ana hədəf"}`,
        description: `${n.parentId ? "Yuxarı rəhbərdən pay" : "HR tərəfindən təyin edilmiş hədəf"}: ${new Intl.NumberFormat("az-AZ").format(n.limit)} ${n.unit}`,
        period: new Date(n.createdAt).toLocaleDateString("az-AZ"),
        target: Number(n.limit) || 0,
        actual: 0,
        unit: n.unit || "AZN",
        stage: "assigned",
        status: "in_progress",
        deadline: "—",
        createdAt: new Date(n.createdAt).toLocaleDateString("az-AZ"),
        updatedAt: new Date(n.updatedAt).toLocaleDateString("az-AZ"),
        responsible: { name: n.assigneeName, role: n.positionName || "İcraçı" },
        measure: n.unit || "AZN", type: "Cascade", method: "Cascade paylanma", weight: 20,
        cascadeNodeId: n.id,
      });
    });
    // 2) SharedKpiCard-lar — cari istifadəçi assignee (və ya owner) olduğu kartlar.
    // HR yaradan olsa da, kart Elvinə təyin edilibsə, Elvinin KPI-larında görünməlidir,
    // yaradan HR-in "Mənim KPI-larım"-da yox.
    const emp = getEmployees().find(e => `${e.firstName} ${e.lastName}` === user.name);
    if (emp) {
      const empKey = `e${emp.id}`;
      sharedCards
        .filter(c => (c.status === "aktiv" || c.status === "natamam") &&
          (c.assigneeIds?.includes(empKey) || (!c.assigneeIds?.length && c.ownerId === empKey)))
        .forEach(c => {
          (c.targets || []).forEach((t: any) => {
            const existsInCascadeTree = tree.some(n => n.assigneeName === user.name && n.cardName === c.name && n.goalName === (t.name || "Ana hədəf"));
            if (existsInCascadeTree) return;
            const target = parseFloat(String(t.targetValue ?? t.value ?? t.target ?? t.scoreLimit ?? "").replace(/[^\d.\-]/g, "")) || 0;
            result.push({
              id: `sk-${c.id}-${t.id}`,
              name: `${withKartSuffix(c.name)} — ${t.name || "Hədəf"}`,
              description: `HR tərəfindən sizə təyin olunmuş KPI (${c.status})`,
              period: c.startDate || "—",
              target, actual: 0, unit: t.unit || (t.type === "Məbləğ" ? "AZN" : ""),
              stage: "assigned",
              status: c.status === "aktiv" ? "in_progress" : "at_risk",
              deadline: c.endDate || "—",
              createdAt: c.createdAt?.slice(0, 10) || "—",
              updatedAt: c.updatedAt?.slice(0, 10) || "—",
              responsible: { name: user.name, role: emp.positionName || "İcraçı" },
              measure: t.type || "—", type: c.frequency || "—", method: t.name || "—", weight: t.weight || 20,
            });
          });
        });
    }
    return result;
  }, [tree, sharedCards, user?.name]);

  // Yalnız cari istifadəçiyə aid KPI-lar. Seed-də olan digər şəxslərin
  // demo KPI-ları başqa hesablarda "Mənim KPI-larım"-da görünməməlidir.
  const myKpis = useMemo(() => {
    const seed = user?.name
      ? MY_KPIS.filter(k => k.responsible.name === user.name)
      : MY_KPIS;
    return [...dynamicMyKpis, ...seed];
  }, [dynamicMyKpis, user?.name]);

  // Rəhbər yalnız öz strukturunu görməlidir, HR/SUPER_ADMIN isə bütün şirkəti.
  const subScopePath = useMemo<string | null>(() => {
    if (!user) return null;
    if (user.role === "HR" || user.role === "SUPER_ADMIN") return null;
    const emps = getEmployees().filter(e => e.active);
    const me = emps.find(e => e.email === user.email) || emps.find(e => `${e.firstName} ${e.lastName}` === user.name);
    return me?.structurePath || null;
  }, [user?.email, user?.name, user?.role]);


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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mt-2">
              <HubCard icon={User} title="Mənim KPI-larım" subtitle="Sizə aid fərdi hədəflər və onların icra vəziyyəti." count={myKpis.length} gradient="from-indigo-500/15 via-indigo-500/5 to-transparent border-indigo-400/40" onClick={() => setView("own")} />
              <HubCard icon={Users} title="Komanda KPI-ları" subtitle="Toplu (kollektiv) hədəflər — komanda olaraq eyni nəticə." count={TEAM_KPIS.length} gradient="from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-400/40" onClick={() => setView("team")} />
              <HubCard icon={Network} title="Tabeçiliyimdəkilərin KPI-ları" subtitle="İyerarxik görünüş, mərhələ nəzarəti və gecikmə bildirişləri." count={HIERARCHY.length} gradient="from-amber-500/15 via-amber-500/5 to-transparent border-amber-400/40" onClick={() => setView("sub")} />
              <HubCard icon={RefreshCw} title="Reviewlar" subtitle="Hazırda Review mərhələsində olan bütün KPI kartları — bir ekrandan izləyin." count={<ReviewsCount />} gradient="from-sky-500/15 via-sky-500/5 to-transparent border-sky-400/40" onClick={() => setView("reviews")} />
            </div>
          </>
        )}
        {view === "own" && <OwnKpisView title="Mənim KPI-larım" subtitle="Sizə aid fərdi hədəflər və onların icra vəziyyəti." data={myKpis} cascadeNodes={tree} />}
        {view === "team" && <OwnKpisView title="Komanda KPI-ları" subtitle="Toplu (kollektiv) hədəflər — komanda olaraq eyni nəticə." data={TEAM_KPIS} />}
        {view === "sub" && <SubordinatesView scopePath={subScopePath} />}
        {view === "reviews" && <ReviewsView />}
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
type DrawerTab = "general" | "targets" | "bsc" | "lifecycle" | "history" | "team" | "comments" | "status" | "setStatus" | "review";

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

const OwnKpisView = ({ title, subtitle, data, cascadeNodes = [] }: { title: string; subtitle: string; data: Kpi[]; cascadeNodes?: CascadeTreeNode[] }) => {
  const [statusF, setStatusF] = useState<string>("all");
  const [periodF, setPeriodF] = useState<string>("all");
  const [q, setQ] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawerKpi, setDrawerKpi] = useState<Kpi | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("general");
  const [distributeNode, setDistributeNode] = useState<CascadeTreeNode | null>(null);

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

      {/* KPI Cards — accordion */}
      <KpiAccordionList
        items={rows.map<AccordionKpi>(k => ({
          id: k.id,
          name: k.name,
          createdAt: k.createdAt,
          deadline: k.deadline,
          status: k.status as AccordionKpiStatus,
          targets: targetsForKpi(k),
        }))}
        onAction={(item, _t, a) => {
          const k = rows.find(r => r.id === item.id);
          if (!k) return;
          const tab: DrawerTab = a === "history" ? "history" : a === "comments" ? "comments" : "general";
          if (a === "reminders") {
            openDrawer(k, "general");
            setTimeout(() => setDrawerTab("history" as DrawerTab), 0);
            return;
          }
          openDrawer(k, tab);
        }}
      />



      <KpiDrawer kpi={drawerKpi} tab={drawerTab} setTab={setDrawerTab} onClose={() => setDrawerKpi(null)} />
      <CascadeDistributeDialog
        open={!!distributeNode}
        onOpenChange={(o) => !o && setDistributeNode(null)}
        existingNode={distributeNode || undefined}
        onDistributed={() => setDistributeNode(null)}
      />
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
const initialsOf = (n: string) => n.split(" ").filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("");
const kpiToKpiCard = (k: Kpi): KpiCardShape => ({
  id: (hashStr(k.id) % 100000) + 1,
  name: k.name,
  icon: null,
  zone: "green",
  target: String(k.target),
  current: String(k.actual),
  unit: k.unit,
  progress: pctOf(k),
  minTarget: 0,
  responsible: k.responsible.name,
  period: k.period,
  type: k.type,
  formula: "",
  generalTarget: `${fmt(k.target)} ${k.unit}`,
  department: "",
  group: "",
  subdivision: "",
  startDate: k.createdAt,
  endDate: k.deadline,
  frequency: k.type,
  team: [{ name: k.responsible.name, role: k.responsible.role, avatar: initialsOf(k.responsible.name) }],
  history: [],
  description: k.description,
  weight: k.weight,
  approvalStatus: "approved",
  subKpis: [],
  matrixId: null,
});

const KpiDrawer = ({ kpi, tab, setTab, onClose, onOpenTarget, reviewMeta, tabsFilter }: {
  kpi: Kpi | null; tab: DrawerTab; setTab: (t: DrawerTab) => void; onClose: () => void;
  onOpenTarget?: (t: CardTarget) => void;
  reviewMeta?: { reviewLabel: string; reviewStart: string; reviewNumber?: number; evaluator?: string; nextReview?: string; reviewStatusLabel?: string; reviewStatusClass?: string; outcomeComment?: string };
  tabsFilter?: DrawerTab[];
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
    <aside className="fixed top-0 right-0 h-screen w-full sm:w-[640px] bg-card border-l border-border shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">KPI-yə bax</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-md hover:bg-secondary inline-flex items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!tabsFilter && (
        <KpiDetailView kpi={kpiToKpiCard(kpi)} compact />
      )}
      {tabsFilter && (
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="p-5">
          {/* Title */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <div className="text-base font-semibold text-foreground">{withKartSuffix(kpi.name)}</div>
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

          {/* Tabs — KPI Detail: 8 fixed tab (spec üzrə) */}
          <div className="flex gap-1 border-b border-border overflow-x-auto -mx-1 px-1 mb-3">
            {([
              ["general", "Ümumi"],
              ["targets", "Hədəflər"],
              ["bsc", "Balanced Scorecard"],
              ["lifecycle", "Lifecycle"],
              ["history", "Tarixçə"],
              ["team", "KPI Üzvləri"],
              ["comments", "Şərhlər"],
              ["status", "Təsdiqləmə Zənciri"],
              ["setStatus", "Set Statusu"],
              ["review", "Review"],
            ] as [DrawerTab, string][])
              .filter(([key]) => !tabsFilter || tabsFilter.includes(key))
              .map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key as DrawerTab)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "general" && (
            <div className="rounded-xl border border-border p-4 grid grid-cols-2 gap-x-4 gap-y-3">
              <MetaRow label="Ölçü vahidi" value={kpi.measure} />
              <MetaRow label="Hədəf tipi" value={kpi.type} />
              <MetaRow label="Hesablama üsulu" value={kpi.method} />
              <MetaRow label="Çəki" value={`${kpi.weight}%`} />
              <MetaRow label="Cari nəticə" value={`${fmt(kpi.actual)} / ${fmt(kpi.target)}`} />
              <MetaRow label="Qalan hədəf" value={`${fmt(Math.max(kpi.target - kpi.actual, 0))} ${kpi.unit === "AZN" ? "₼" : kpi.unit}`} />
              <MetaRow label="Növbəti icmal" value="05.06.2025" />
              <MetaRow label="Trend" value={p >= 100 ? "Tamamlanıb" : "Artan (↑) daha yaxşıdır"} />
            </div>
          )}

          {tab === "bsc" && (
            <div className="rounded-xl border border-border p-4">
              <div className="text-sm font-semibold text-foreground mb-2">Balanced Scorecard</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <MetaRow label="Perspektiv" value="Maliyyə" />
                <MetaRow label="Strateji hədəf" value={kpi.name} />
                <MetaRow label="Ölçü (KPI)" value={`${kpi.measure}`} />
                <MetaRow label="Hədəf dəyəri" value={`${fmt(kpi.target)} ${kpi.unit}`} />
                <MetaRow label="Cari nəticə" value={`${fmt(kpi.actual)} ${kpi.unit}`} />
                <MetaRow label="İcra faizi" value={`${p}%`} />
              </div>
            </div>
          )}

          {tab === "lifecycle" && (
            <ol className="relative border-l border-border pl-4 space-y-4">
              {[
                { name: "Planlama", date: kpi.createdAt, done: true },
                { name: "Təsdiqləmə", date: kpi.createdAt, done: true },
                { name: "İcra", date: kpi.updatedAt, done: p < 100 },
                { name: "Qiymətləndirmə", date: kpi.deadline, done: p >= 100 },
              ].map((s, i) => (
                <li key={i} className="relative">
                  <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ring-4 ${s.done ? "bg-emerald-500 ring-emerald-500/15" : "bg-muted ring-muted"}`} />
                  <div className="text-sm font-medium text-foreground">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">{s.date}</div>
                </li>
              ))}
            </ol>
          )}

          {tab === "history" && (
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
          )}

          {tab === "team" && (
            <div className="space-y-2">
              {[
                { name: kpi.responsible.name, role: kpi.responsible.role, tag: "Məsul" },
                { name: "Aysel İbrahimova", role: "Qiymətləndirici", tag: "Qiymətləndirici" },
                { name: "Rəşad Quliyev", role: "Təsdiqləyən", tag: "Təsdiqləyən" },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                    {m.name.split(" ").map(x => x[0]).join("").slice(0,2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{m.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{m.role}</div>
                  </div>
                  <Badge className="bg-secondary text-secondary-foreground">{m.tag}</Badge>
                </div>
              ))}
            </div>
          )}

          {tab === "comments" && (
            <>
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
            </>
          )}

          {tab === "status" && (
            <ol className="space-y-2">
              {[
                { role: "Şöbə Müdiri", name: "Abbas Əliyev", state: "ok" as const },
                { role: "Departament Direktoru", name: "Aysel Məmmədova", state: "wait" as const },
                { role: "HR Admin", name: "Super Adminov", state: "wait" as const },
              ].map((r, i) => (
                <li key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${r.state === "ok" ? "border-emerald-500/30 bg-emerald-500/10" : "border-blue-500/30 bg-blue-500/10"}`}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{i + 1}. {r.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{r.role}</div>
                  </div>
                  <span className="text-xs font-medium shrink-0 ml-2">{r.state === "ok" ? "Təsdiqləndi" : "Gözlənilir"}</span>
                </li>
              ))}
            </ol>
          )}

          {tab === "setStatus" && (
            <div className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Cari set statusu</span>
                <Badge className={statusMeta[kpi.status].cls}>{statusMeta[kpi.status].label}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">İcra faizi</span>
                <span className="text-sm font-medium tabular-nums">{p}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Deadline</span>
                <span className="text-sm">{kpi.deadline}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Son yenilənmə</span>
                <span className="text-sm">{kpi.updatedAt}</span>
              </div>
            </div>
          )}

          {tab === "targets" && (() => {
            const targets = buildCardTargets(kpi.id, kpi.target || 100, kpi.unit || "%");
            return (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/40 text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Hədəf</th>
                      <th className="text-right px-3 py-2 font-medium">Plan</th>
                      <th className="text-right px-3 py-2 font-medium">Fakt</th>
                      <th className="text-left px-3 py-2 font-medium w-24">İcra %</th>
                      <th className="text-center px-3 py-2 font-medium">Status</th>
                      {onOpenTarget && <th className="text-right px-3 py-2 font-medium w-12">Bax</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {targets.map(t => {
                      const pct = Math.round((t.fakt / t.plan) * 100);
                      const bar = pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-amber-500" : "bg-rose-500";
                      return (
                        <tr key={t.id} className="border-t border-border align-top hover:bg-secondary/20">
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-foreground">{t.name}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">Çəki: {t.weight}%</div>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{fmt(t.plan)} {t.unit}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{fmt(t.fakt)} {t.unit}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                <div className={`h-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="tabular-nums font-medium w-8 text-right">{pct}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge className={`${statusMeta[t.status].cls} text-[10px] px-1.5 py-0.5`}>{statusMeta[t.status].label}</Badge>
                          </td>
                          {onOpenTarget && (
                            <td className="px-3 py-2.5 text-right">
                              <button onClick={() => onOpenTarget(t)} className="w-7 h-7 inline-flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground" aria-label="Bax" title="Hədəf detalı">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {tab === "review" && (() => {
            const targets = buildCardTargets(kpi.id, kpi.target || 100, kpi.unit || "%");
            const completed = targets.filter(t => t.status === "completed").length;
            const atRisk = targets.filter(t => t.status === "at_risk" || t.status === "delayed").length;
            const avgProg = targets.length ? Math.round(targets.reduce((s, t) => s + Math.round((t.fakt / t.plan) * 100), 0) / targets.length) : 0;
            const reviewNotes = ["Plan üzrə irəliləyir.", "Bir qədər gecikmə var.", "Yaxşı nəticə göstərilir.", "Təkmilləşdirmə tələb olunur.", "Komanda fəaldır."];
            return (
              <div className="space-y-4">
                {/* Review Status */}
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="text-sm font-semibold text-foreground mb-3">Review Statusu</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <MetaRow label="Status" value={<Badge className={reviewMeta?.reviewStatusClass || "bg-sky-500/15 text-sky-700"}>{reviewMeta?.reviewStatusLabel || "İcrada"}</Badge>} />
                    <MetaRow label="Review növü" value={reviewMeta?.reviewLabel || "Həftəlik Review"} />
                    <MetaRow label="Review #" value={reviewMeta?.reviewNumber ?? 2} />
                    <MetaRow label="Plan tarixi" value={reviewMeta?.reviewStart || kpi.deadline} />
                    <MetaRow label="Son yenilənmə" value={kpi.updatedAt} />
                    <MetaRow label="Qiymətləndirici" value={reviewMeta?.evaluator || kpi.responsible.name} />
                    <MetaRow label="Qiymətləndirilən əməkdaş" value={kpi.responsible.name} />
                  </div>
                </div>

                {/* Review Xülasəsi */}
                <div>
                  <div className="text-sm font-semibold text-foreground mb-2">Review Xülasəsi</div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <SummaryStat label="Ortalama Progress" value={`${avgProg}%`} tone="indigo" />
                    <SummaryStat label="Tamamlanan KPI" value={`${completed} / ${targets.length}`} tone="green" />
                    <SummaryStat label="Riskdə olan KPI" value={`${atRisk}`} tone="red" />
                    <SummaryStat label="Son qiymətləndirmə" value="4.6 / 5" tone="amber" />
                    <SummaryStat label="Növbəti Review" value={reviewMeta?.nextReview || "22.06.2025"} tone="blue" />
                  </div>
                </div>

                {/* Hədəflərin Review vəziyyəti */}
                <div>
                  <div className="text-sm font-semibold text-foreground mb-2">Hədəflərin Review vəziyyəti</div>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/40 text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">KPI / Hədəf</th>
                          <th className="text-left px-3 py-2 font-medium w-24">Progress</th>
                          <th className="text-center px-3 py-2 font-medium">Status</th>
                          <th className="text-right px-3 py-2 font-medium">Son nəticə</th>
                          <th className="text-left px-3 py-2 font-medium">Review qeydi</th>
                          {onOpenTarget && <th className="text-right px-3 py-2 font-medium w-12">Bax</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {targets.map((t, i) => {
                          const pct = Math.round((t.fakt / t.plan) * 100);
                          const bar = pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-amber-500" : "bg-rose-500";
                          return (
                            <tr key={t.id} className="border-t border-border hover:bg-secondary/20">
                              <td className="px-3 py-2.5 font-medium text-foreground">{t.name}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                    <div className={`h-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                  </div>
                                  <span className="tabular-nums font-medium w-8 text-right">{pct}%</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <Badge className={`${statusMeta[t.status].cls} text-[10px] px-1.5 py-0.5`}>{statusMeta[t.status].label}</Badge>
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums">{(pct / 20).toFixed(1)} / 5</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{reviewNotes[i % reviewNotes.length]}</td>
                              {onOpenTarget && (
                                <td className="px-3 py-2.5 text-right">
                                  <button onClick={() => onOpenTarget(t)} className="w-7 h-7 inline-flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground" aria-label="Bax" title="Hədəf detalı">
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      )}
    </aside>
  );
};

const MetaRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className="text-sm text-foreground mt-0.5">{value}</div>
  </div>
);

const SummaryStat = ({ label, value, tone }: { label: string; value: React.ReactNode; tone: "indigo" | "green" | "red" | "amber" | "blue" }) => {
  const map = {
    indigo: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    green:  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    red:    "bg-rose-500/10 text-rose-600 border-rose-500/20",
    amber:  "bg-amber-500/10 text-amber-600 border-amber-500/20",
    blue:   "bg-sky-500/10 text-sky-600 border-sky-500/20",
  } as const;
  return (
    <div className={`rounded-lg border p-2.5 ${map[tone]}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
};

// ============================================================
// SUBORDINATES VIEW — Dynamic tree from real org data
// ============================================================
type SubTab = "info" | "history" | "comments" | "reminders" | "notify" | "risk";
type NodeKind = "company" | "region" | "department" | "division" | "team" | "employee";

interface TreeNode {
  id: string;
  name: string;
  kind: NodeKind;
  parent?: string;
  employees: number;
  avgPct: number;
  completed: number;
  atRisk: number;
  delayed: number;
  trend: "up" | "down" | "flat";
  position?: string;
  team?: string;
  division?: string;
  status?: KpiStatus;
  empId?: number;
  riskReasons?: string[];
  managerNote?: string;
}

const kindIcon: Record<NodeKind, any> = {
  company: Building2, region: MapPin, department: Layers, division: Layers, team: Users, employee: User,
};
const kindLabel: Record<NodeKind, string> = {
  company: "Şirkət", region: "Region", department: "Departament", division: "Şöbə", team: "Komanda", employee: "Əməkdaş",
};

const hashStr = (s: string) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
};

const buildOrgTree = (scopePath?: string | null): TreeNode[] => {
  const emps = getEmployees().filter(e => e.active);
  const structs = getStructures();

  const empByPath = new Map<string, typeof emps>();
  emps.forEach(e => {
    const p = e.structurePath ?? "";
    if (!empByPath.has(p)) empByPath.set(p, []);
    empByPath.get(p)!.push(e);
  });

  const nodes: TreeNode[] = [];

  const makeEmp = (e: (typeof emps)[number], parentId: string, pathLabel: string): TreeNode => {
    const h = hashStr(`e${e.id}`);
    const stats: KpiStatus[] = ["in_progress", "at_risk", "completed", "delayed"];
    return {
      id: `e${e.id}`, empId: e.id, kind: "employee", parent: parentId,
      name: `${e.firstName} ${e.lastName}`,
      position: e.positionName ?? "Əməkdaş",
      team: pathLabel.split(" › ").slice(-1)[0] || "—",
      division: pathLabel || "—",
      employees: 1,
      avgPct: 55 + (h % 45),
      completed: (h % 5) + 1,
      atRisk: (h >> 3) % 3,
      delayed: (h >> 6) % 2,
      trend: (["up", "down", "flat"] as const)[h % 3],
      status: stats[h % 4],
    };
  };

  const countSub = (s: OrgStructure, path: string): number => {
    let c = (empByPath.get(path) ?? []).length;
    s.children.forEach(ch => { c += countSub(ch, `${path} › ${ch.name}`); });
    return c;
  };

  const walk = (s: OrgStructure, parentPath: string, parentId: string) => {
    const path = parentPath ? `${parentPath} › ${s.name}` : s.name;
    const id = `s${s.id}`;
    const h = hashStr(id);
    const t = s.type.toLowerCase();
    const kind: NodeKind = t.includes("depart") ? "department"
      : (t.includes("komanda") || t.includes("team")) ? "team"
      : "division";
    const empCount = countSub(s, path);
    nodes.push({
      id, name: s.name, kind, parent: parentId || undefined,
      employees: empCount,
      avgPct: 60 + (h % 40),
      completed: (h % 30) + 3,
      atRisk: (h >> 3) % 10,
      delayed: (h >> 6) % 5,
      trend: (["up", "down", "flat"] as const)[h % 3],
    });
    // Employees first (direct), then sub-structures
    (empByPath.get(path) ?? []).forEach(e => nodes.push(makeEmp(e, id, path)));
    s.children.forEach(ch => walk(ch, path, id));
  };

  // Manager scope: root the tree at the manager's own structure unit
  if (scopePath) {
    let target: OrgStructure | null = null;
    const search = (list: OrgStructure[], parentArr: string[]) => {
      for (const n of list) {
        if (target) return;
        const cur = [...parentArr, n.name];
        if (cur.join(" › ") === scopePath) { target = n; return; }
        if (n.children.length) search(n.children, cur);
      }
    };
    search(structs, []);
    if (target) {
      const parentPath = scopePath.split(" › ").slice(0, -1).join(" › ");
      walk(target, parentPath, "");
      return nodes;
    }
    // scope path not found → return empty
    return nodes;
  }

  const rootId = "all";
  const rootEmpCount = emps.length;
  const rootH = hashStr(rootId);
  nodes.push({
    id: rootId, name: "Bütün şirkət", kind: "company",
    employees: rootEmpCount,
    avgPct: 70 + (rootH % 20),
    completed: Math.round(rootEmpCount * 0.6),
    atRisk: Math.round(rootEmpCount * 0.12),
    delayed: Math.round(rootEmpCount * 0.05),
    trend: "up",
  });
  (empByPath.get("") ?? []).forEach(e => nodes.push(makeEmp(e, rootId, "Bütün şirkət")));
  structs.forEach(s => walk(s, "", rootId));
  return nodes;
};


// Per-employee KPI list (deterministic subset of MY_KPIS variants)
interface EmpKpi { id: string; name: string; desc: string; plan: number; fakt: number; unit: string; status: KpiStatus; }
const BASE_KPIS: Omit<EmpKpi, "id" | "fakt" | "status">[] = [
  { name: "Satış Həcminin Artırılması",         desc: "Satış həcmini ötən rübə müqayisədə artırmaq", plan: 500_000, unit: "₼" },
  { name: "Yeni Müştəri Qazanılması",           desc: "Yeni müştərilərin sayını artırmaq",            plan: 120,     unit: "" },
  { name: "Müştəri Məmnuniyyətinin Artırılması", desc: "Müştəri məmnuniyyət səviyyəsini yüksəltmək",  plan: 90,      unit: "%" },
  { name: "Kredit Borclarının Azaldılması",     desc: "Kredit borclarının minimuma endirilməsi",      plan: 200_000, unit: "₼" },
  { name: "Yeni Məhsul Satışının Artırılması",  desc: "Yeni məhsul satışlarının artırılması",         plan: 150_000, unit: "₼" },
];
const buildEmpKpis = (empId: number): EmpKpi[] => {
  const h = hashStr(`ek${empId}`);
  return BASE_KPIS.map((b, i) => {
    const hh = hashStr(`ek${empId}-${i}`);
    const ratio = 0.6 + ((hh % 45) / 100); // 0.60..1.05
    const fakt = Math.round(b.plan * ratio);
    const pct = Math.round((fakt / b.plan) * 100);
    const status: KpiStatus = pct >= 100 ? "completed" : pct >= 90 ? "in_progress" : pct >= 75 ? "at_risk" : "delayed";
    return { id: `${empId}-k${i}`, ...b, fakt, status };
  }).filter((_, i) => (h >> i) & 1 || i < 3); // at least 3
};

interface SubordinatesViewProps {
  scopePath?: string | null;
  actionsMode?: "tracking" | "results";
  onOpenEmployee?: (empId: number, name: string) => void;
  title?: string;
  subtitle?: string;
}

export const SubordinatesView = ({
  scopePath,
  actionsMode = "tracking",
  onOpenEmployee,
  title = "Tabeçiliyimdəkilərin KPI-ları",
  subtitle = "Əsas səhifə / KPI İzlənməsi / Tabeçiliyimdəkilərin KPI-ları",
}: SubordinatesViewProps = {}) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const h = () => setTick(t => t + 1);
    window.addEventListener("org-updated", h);
    return () => window.removeEventListener("org-updated", h);
  }, []);
  const tree = useMemo(() => buildOrgTree(scopePath), [tick, scopePath]);

  const childrenOf = (id: string) => tree.filter(n => n.parent === id);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<SubTab>("info");
  const [period, setPeriod] = useState("2025 / 1-ci rüb");
  const [metric, setMetric] = useState("avg");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [empKpiListFor, setEmpKpiListFor] = useState<{ empId: number; name: string; position?: string; division?: string } | null>(null);
  const [viewKpi, setViewKpi] = useState<Kpi | null>(null);
  const [viewKpiTab, setViewKpiTab] = useState<DrawerTab>("general");
  const [cardDrawer, setCardDrawer] = useState<{ card: Kpi & { progress: number; createdAt: string; updatedAt: string }; employee: { empId: number; name: string; position?: string; division?: string } } | null>(null);
  const [targetDetail, setTargetDetail] = useState<{ cardId: string; cardName: string; target: CardTarget } | null>(null);

  // Deterministic period/date helpers for the employee's KPI card list
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const dateFromHash = (h: number, base = 2025) => {
    const day = 1 + (Math.abs(h) % 28);
    const mo = 1 + (Math.abs(h >> 3) % 12);
    return `${pad2(day)}.${pad2(mo)}.${base}`;
  };
  const PERIODS = ["2025 / 1-ci rüb", "2025 / 2-ci rüb", "2025 / 3-cü rüb", "2025 / 4-cü rüb"];
  const empKpiCards = useMemo(() => {
    if (!empKpiListFor) return [] as (Kpi & { progress: number; createdAt: string; updatedAt: string })[];
    return buildEmpKpis(empKpiListFor.empId).map((k, i) => {
      const h = hashStr(k.id);
      const pct = Math.round((k.fakt / k.plan) * 100);
      const period = PERIODS[Math.abs(h) % PERIODS.length];
      const createdAt = dateFromHash(h, 2025);
      const updatedAt = dateFromHash(h ^ 0x9e3779b1, 2025);
      const deadline = dateFromHash(h ^ 0x51f4a5, 2025);
      const kpi: Kpi = {
        id: k.id, name: k.name, description: k.desc, period,
        target: k.plan, actual: k.fakt, unit: k.unit || "ədəd", stage: "assigned",
        status: k.status, deadline, createdAt, updatedAt,
        responsible: { name: empKpiListFor.name, role: "Əməkdaş" },
        measure: k.unit || "ədəd", type: "Rüblük", method: "—", weight: 20,
      };
      return { ...kpi, progress: Math.min(pct, 100), createdAt, updatedAt };
    });
  }, [empKpiListFor]);

  const selected = selectedId ? tree.find(n => n.id === selectedId) ?? null : null;

  const toggle = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const openTab = (nodeId: string, t: SubTab) => {
    setSelectedId(nodeId);
    setTab(t);
    setPanelOpen(true);
    setOpenMenu(null);
  };

  // Flatten visible rows respecting expand state + search filter, employees first
  const rows = useMemo(() => {
    const out: { node: TreeNode; depth: number }[] = [];
    const s = q.trim().toLowerCase();
    const sortChildren = (arr: TreeNode[]) => {
      const emp = arr.filter(n => n.kind === "employee");
      const rest = arr.filter(n => n.kind !== "employee");
      return [...emp, ...rest];
    };
    const walk = (parentId: string | undefined, depth: number) => {
      sortChildren(tree.filter(n => n.parent === parentId)).forEach(n => {
        const match = !s || n.name.toLowerCase().includes(s);
        if (match) out.push({ node: n, depth });
        if (expanded.has(n.id)) walk(n.id, depth + 1);
      });
    };
    tree.filter(n => !n.parent).forEach(root => {
      out.push({ node: root, depth: 0 });
      if (expanded.has(root.id)) walk(root.id, 1);
    });
    return out;
  }, [expanded, q, tree]);

  const totals = useMemo(() => {
    const rootFull = tree.find(n => n.id === "all");
    if (rootFull) return rootFull;
    // Scoped tree: aggregate top-level roots
    const roots = tree.filter(n => !n.parent);
    const sum = (k: keyof TreeNode) => roots.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    const employees = sum("employees");
    const completed = sum("completed");
    const atRisk = sum("atRisk");
    const delayed = sum("delayed");
    const avgPct = roots.length ? Math.round(roots.reduce((a, r) => a + r.avgPct, 0) / roots.length) : 0;
    return { employees, avgPct, completed, atRisk, delayed } as TreeNode;
  }, [tree]);
  const deptCount = tree.filter(n => n.kind === "department").length;


  return (
    <div className="flex gap-4">
      {/* LEFT */}
      <div className={`flex-1 min-w-0 ${panelOpen && selected ? "lg:pr-2" : ""}`}>
        <PageHero
          badge="Rəhbər Paneli"
          icon={Network}
          title={title}
          subtitle={subtitle}
        />


        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
          <SumCard icon={MapPin} label="Əhatə dairəsi" primary={`${deptCount} Departament`} secondary={`${tree.filter(n => n.kind === "division").length} Şöbə`} tone="indigo" />
          <SumCard icon={Users} label="Ümumi əməkdaş" primary={fmt(totals.employees)} tone="violet" />
          <SumCard icon={LineChart} label="Ortalama icra faizi" primary={`${totals.avgPct}%`} tone="blue" />
          <SumCard icon={Check} label="Tamamlanan KPI" primary={fmt(totals.completed)} tone="green" />
          <SumCard icon={AlertTriangle} label="Riskdə olan KPI" primary={fmt(totals.atRisk)} tone="amber" />
          <SumCard icon={Clock} label="Gecikdirilən KPI" primary={fmt(totals.delayed)} tone="red" />
        </div>

        {/* Filter row */}
        <div className="rounded-xl border border-border bg-card p-3 mb-3 flex items-center gap-3 flex-wrap">
          <div>
            <label className="text-[11px] text-muted-foreground">Dövr</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-44 h-9 mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2025 / 1-ci rüb">2025 / 1-ci rüb</SelectItem>
                <SelectItem value="2025 / 2-ci rüb">2025 / 2-ci rüb</SelectItem>
                <SelectItem value="2025 / il">2025 / il</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Metrik</label>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="w-48 h-9 mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="avg">Ortalama icra faizi</SelectItem>
                <SelectItem value="completed">Tamamlanan KPI</SelectItem>
                <SelectItem value="risk">Riskdə olan KPI</SelectItem>
                <SelectItem value="delayed">Gecikdirilən KPI</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44 h-9 mt-0.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün statuslar</SelectItem>
                <SelectItem value="in_progress">İcradadır</SelectItem>
                <SelectItem value="at_risk">Riskdə</SelectItem>
                <SelectItem value="completed">Tamamlandı</SelectItem>
                <SelectItem value="delayed">Gecikir</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Axtarış..."
              className="w-56 pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5"><Filter className="w-3.5 h-3.5" /> Filtrlər</Button>
        </div>

        {/* Tree grid */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-secondary/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Səviyyə</th>
                  <th className="text-right px-4 py-3 font-medium">Əhatə dairəsi</th>
                  <th className="text-left px-4 py-3 font-medium w-56">Ortalama icra faizi</th>
                  <th className="text-center px-4 py-3 font-medium">Tamamlanan KPI</th>
                  <th className="text-center px-4 py-3 font-medium">Riskdə olan KPI</th>
                  <th className="text-center px-4 py-3 font-medium">Gecikdirilən KPI</th>
                  <th className="text-center px-4 py-3 font-medium">Trend</th>
                  <th className="text-right px-4 py-3 font-medium w-24">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ node, depth }) => {
                  const Icon = kindIcon[node.kind];
                  const hasChildren = childrenOf(node.id).length > 0;
                  const isOpen = expanded.has(node.id);
                  const isSel = node.id === selectedId;
                  const isEmp = node.kind === "employee";
                  return (
                    <tr key={node.id}
                      onClick={() => !isEmp && hasChildren && toggle(node.id)}
                      className={`border-t border-border transition-colors ${isSel ? "bg-primary/5" : "hover:bg-secondary/20"} ${(!isEmp && hasChildren) ? "cursor-pointer" : ""}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 20}px` }}>
                          {hasChildren ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggle(node.id); }}
                              className="w-5 h-5 rounded hover:bg-secondary inline-flex items-center justify-center text-muted-foreground transition-transform"
                              aria-label="Aç/bağla"
                            >
                              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                            </button>
                          ) : <span className="w-5" />}
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center border ${isEmp ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary/60 border-border text-muted-foreground"}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">{node.name}</div>
                            {isEmp && <div className="text-[11px] text-muted-foreground truncate">{node.position}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-foreground">{isEmp ? "—" : fmt(node.employees)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${node.avgPct >= 90 ? "bg-emerald-500" : node.avgPct >= 75 ? "bg-amber-500" : "bg-rose-500"}`}
                              style={{ width: `${Math.min(node.avgPct, 100)}%` }} />
                          </div>
                          <span className="text-xs tabular-nums font-medium w-9 text-right">{node.avgPct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{fmt(node.completed)}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-amber-600">{fmt(node.atRisk)}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-rose-600">{fmt(node.delayed)}</td>
                      <td className="px-4 py-2.5 text-center">
                        {node.trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-500 inline" />}
                        {node.trend === "down" && <TrendingDown className="w-4 h-4 text-rose-500 inline" />}
                        {node.trend === "flat" && <Minus className="w-4 h-4 text-muted-foreground inline" />}
                      </td>
                      <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                        {isEmp ? (
                          actionsMode === "results" ? (
                            <button
                              onClick={() => { if (node.empId != null) onOpenEmployee?.(node.empId, node.name); }}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Nəticələrə bax"
                              title="Nəticələrə bax"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => { if (node.empId != null) setEmpKpiListFor({ empId: node.empId, name: node.name, position: node.position, division: node.division }); }}
                              className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="KPI-yə bax"
                              title="KPI-yə bax"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
            <span>Cəmi: {fmt(totals.employees)} əməkdaş, {fmt(totals.completed + totals.atRisk + totals.delayed)} KPI</span>
            <span>Səhifə 1 / 1</span>
          </div>
        </div>
      </div>

      {/* RIGHT: sticky panel (yalnız tracking rejimində) */}
      {actionsMode === "tracking" && panelOpen && selected && (
        <SubDetailPanel node={selected} tab={tab} setTab={setTab} onClose={() => setPanelOpen(false)} />
      )}
      {actionsMode === "tracking" && !panelOpen && selected && (
        <button onClick={() => setPanelOpen(true)}
          className="fixed right-4 top-24 z-30 rounded-full bg-primary text-primary-foreground shadow-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5 hover:opacity-90">
          <ChevronLeft className="w-4 h-4" /> Detal paneli
        </button>
      )}

      {/* Əməkdaşın KPI kartları siyahısı — Nəticələr modulu ilə eyni sadə cədvəl */}
      <Dialog open={!!empKpiListFor} onOpenChange={(o) => { if (!o) { setEmpKpiListFor(null); } }}>
        <DialogContent className="w-[90vw] max-w-[1200px] h-[80vh] max-h-[80vh] p-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b border-border">
            <DialogTitle className="text-xl">KPI Kartları — {empKpiListFor?.name ?? "—"}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">KPI kartının adı</th>
                    <th className="text-left px-4 py-3 font-medium">Dövr</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium w-44">Progress</th>
                    <th className="text-left px-4 py-3 font-medium">Yaradılma tarixi</th>
                    <th className="text-left px-4 py-3 font-medium">Son yenilənmə tarixi</th>
                    <th className="text-right px-4 py-3 font-medium w-24">Əməliyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {empKpiCards.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">Bu əməkdaş üçün KPI kartı yoxdur.</td></tr>
                  ) : empKpiCards.map(k => (
                    <tr key={k.id} className="border-t border-border hover:bg-secondary/20">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{withKartSuffix(k.name)}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{k.description}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{k.period}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={statusMeta[k.status].cls}>{statusMeta[k.status].label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={k.progress} className="h-2 flex-1" />
                          <span className="text-xs tabular-nums font-medium w-9 text-right">{k.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{k.createdAt}</td>
                      <td className="px-4 py-3 text-muted-foreground">{k.updatedAt}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (!empKpiListFor) return;
                            setCardDrawer({ card: k, employee: empKpiListFor });
                            setEmpKpiListFor(null);
                          }}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Bax"
                          title="Bax"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* KPI Detail — mövcud KpiDrawer komponenti reuse edilir */}
      <KpiDrawer kpi={viewKpi} tab={viewKpiTab} setTab={setViewKpiTab} onClose={() => setViewKpi(null)} />

      {/* Kartın hədəfləri drawer */}
      <CardTargetsDrawer
        data={cardDrawer}
        onClose={() => setCardDrawer(null)}
        onOpenTarget={(t) => cardDrawer && setTargetDetail({ cardId: cardDrawer.card.id, cardName: cardDrawer.card.name, target: t })}
      />

      {/* Hədəf tarixçəsi drawer (nested) */}
      <TargetDetailDrawer data={targetDetail} onClose={() => setTargetDetail(null)} />

    </div>
  );
};

const SumCard = ({ icon: Icon, label, primary, secondary, tone }: {
  icon: any; label: string; primary: string; secondary?: string; tone: "indigo" | "violet" | "blue" | "green" | "amber" | "red";
}) => {
  const map = {
    indigo: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    violet: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    blue:   "bg-sky-500/10 text-sky-600 border-sky-500/20",
    green:  "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    amber:  "bg-amber-500/10 text-amber-600 border-amber-500/20",
    red:    "bg-rose-500/10 text-rose-600 border-rose-500/20",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${map}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground truncate">{label}</div>
        <div className="text-lg font-semibold text-foreground tabular-nums leading-tight">{primary}</div>
        {secondary && <div className="text-[11px] text-muted-foreground truncate">{secondary}</div>}
      </div>
    </div>
  );
};

// ============================================================
// SUB DETAIL PANEL
// ============================================================
const subTabLabels: Record<SubTab, string> = {
  info: "İcra məlumatı", history: "İcra tarixçəsi", comments: "Şərhlər",
  reminders: "Xatırlatmalar", notify: "Bildiriş göndər", risk: "Risk səbəbi",
};

const SubDetailPanel = ({ node, tab, setTab, onClose }: {
  node: TreeNode; tab: SubTab; setTab: (t: SubTab) => void; onClose: () => void;
}) => {
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({});
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMsg, setNotifyMsg] = useState("");
  const [notifyPri, setNotifyPri] = useState("normal");

  useEffect(() => {
    if (!commentsMap[node.id]) setCommentsMap(m => ({ ...m, [node.id]: initialComments(node.id) }));
  }, [node.id, commentsMap]);

  useEffect(() => {
    if (tab === "comments" && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [tab, commentsMap, node.id]);

  const comments = commentsMap[node.id] || [];
  const history = initialHistory(node.id);
  const reminders = initialReminders(node.id);
  const empKpis = useMemo(() => node.empId ? buildEmpKpis(node.empId) : [], [node.empId]);

  const sendComment = () => {
    const t = draft.trim(); if (!t) return;
    const now = new Date();
    const stamp = `${String(now.getDate()).padStart(2,"0")}.${String(now.getMonth()+1).padStart(2,"0")}.${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    setCommentsMap(m => ({ ...m, [node.id]: [...(m[node.id] || []), { id: `${node.id}-c${Date.now()}`, author: "Siz", role: "Rəhbər", date: stamp, text: t }] }));
    setDraft("");
    toast({ title: "Şərh əlavə edildi" });
  };

  const sendNotify = () => {
    if (!notifyTitle.trim() || !notifyMsg.trim()) { toast({ title: "Başlıq və mesaj tələb olunur", variant: "destructive" }); return; }
    toast({ title: "Bildiriş göndərildi", description: `${node.name} → ${notifyTitle} (${notifyPri})` });
    setNotifyTitle(""); setNotifyMsg(""); setNotifyPri("normal");
  };

  const isEmp = node.kind === "employee";
  const stampBadge = node.status ? statusMeta[node.status] : { label: kindLabel[node.kind], cls: "bg-secondary text-secondary-foreground" };

  const riskLevel = node.delayed > 0 ? "high" : node.atRisk > 0 ? "med" : "low";
  const riskColor = riskLevel === "high" ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
    : riskLevel === "med" ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
  const riskLabel = riskLevel === "high" ? "Yüksək" : riskLevel === "med" ? "Orta" : "Aşağı";

  return (
    <aside className="hidden lg:flex sticky top-4 h-[calc(100vh-2rem)] w-[440px] shrink-0 flex-col rounded-xl border border-border bg-card shadow-lg overflow-hidden animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{subTabLabels[tab]}</h3>
        <button onClick={onClose} className="w-7 h-7 rounded-md hover:bg-secondary inline-flex items-center justify-center text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        {/* Person header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center text-sm shrink-0">
              {node.name.split(" ").map(x => x[0]).join("").slice(0,2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground truncate">{node.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {isEmp ? `${node.position} · ${node.division}` : kindLabel[node.kind]}
              </div>
            </div>
            <Badge className={stampBadge.cls}>{stampBadge.label}</Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
            <TabsList className="w-full grid grid-cols-4 mb-3">
              <TabsTrigger value="info" className="text-xs">İcra məlumatı</TabsTrigger>
              <TabsTrigger value="history" className="text-xs">Tarixçə</TabsTrigger>
              <TabsTrigger value="comments" className="text-xs">Şərhlər</TabsTrigger>
              <TabsTrigger value="reminders" className="text-xs">Xatırlat.</TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-3 py-2.5 border-b border-border bg-secondary/30">
                  <div className="text-sm font-semibold text-foreground">KPI-ların siyahısı</div>
                </div>
                {isEmp && empKpis.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary/20 text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">KPI</th>
                          <th className="text-right px-3 py-2 font-medium">Plan</th>
                          <th className="text-right px-3 py-2 font-medium">Fakt</th>
                          <th className="text-left px-3 py-2 font-medium w-24">İcra %</th>
                          <th className="text-center px-3 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empKpis.map(k => {
                          const pct = Math.round((k.fakt / k.plan) * 100);
                          const barColor = pct >= 100 ? "bg-emerald-500" : pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-amber-500" : "bg-rose-500";
                          return (
                            <tr key={k.id} className="border-t border-border align-top">
                              <td className="px-3 py-2.5">
                                <div className="font-medium text-foreground">{withKartSuffix(k.name)}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{k.desc}</div>
                              </td>
                              <td className="px-3 py-2.5 text-right tabular-nums">{fmt(k.plan)} {k.unit}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums">{fmt(k.fakt)} {k.unit}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                                    <div className={`h-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                  </div>
                                  <span className="tabular-nums font-medium w-8 text-right">{pct}%</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <Badge className={`${statusMeta[k.status].cls} text-[10px] px-1.5 py-0.5`}>{statusMeta[k.status].label}</Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                ) : (
                  <div className="p-4 text-xs text-muted-foreground text-center">Bu səviyyə üçün KPI siyahısı yalnız əməkdaş səviyyəsində göstərilir.</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <ol className="relative border-l-2 border-border pl-4 space-y-4">
                {history.map(h => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[9px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15" />
                    <div className="text-[11px] text-muted-foreground">{h.date} {h.time}</div>
                    <div className="text-sm font-medium text-foreground">{h.author}</div>
                    <div className="text-xs text-muted-foreground">
                      {h.field}: <span className="text-foreground">{h.from}</span> → <span className="text-primary font-medium">{h.to}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </TabsContent>

            <TabsContent value="comments">
              <div className="space-y-2.5">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex-shrink-0 flex items-center justify-center text-xs font-semibold">
                      {c.author.split(" ").map(x => x[0]).join("").slice(0,2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs"><span className="font-medium text-foreground">{c.author}</span><span className="text-muted-foreground"> · {c.date}</span></div>
                      <div className="mt-1 text-sm text-foreground rounded-lg bg-secondary/50 border border-border px-3 py-2">{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                <button className="w-8 h-8 rounded-md hover:bg-secondary text-muted-foreground inline-flex items-center justify-center" aria-label="Fayl əlavə et"><Paperclip className="w-4 h-4" /></button>
                <input value={draft} onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                  placeholder="Şərhinizi yazın..."
                  className="flex-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                <Button size="sm" onClick={sendComment} className="gap-1"><Send className="w-3.5 h-3.5" /> Göndər</Button>
              </div>
            </TabsContent>

            <TabsContent value="reminders">
              <ol className="relative border-l-2 border-border pl-4 space-y-4">
                {reminders.map(r => (
                  <li key={r.id} className="relative">
                    <span className={`absolute -left-[9px] top-1 w-3 h-3 rounded-full ring-4 ${r.read ? "bg-emerald-500 ring-emerald-500/15" : "bg-amber-500 ring-amber-500/15"}`} />
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
              </ol>
              <p className="mt-3 text-[11px] text-muted-foreground border-t border-border pt-2">Yalnız rəhbər tərəfindən göndərilən xatırlatmalar göstərilir.</p>
            </TabsContent>
          </Tabs>

          {tab === "notify" && (
            <div className="mt-3 rounded-lg border border-border p-3 space-y-3">
              <div className="text-xs font-semibold text-foreground">Bildiriş göndər — {node.name}</div>
              <div>
                <label className="text-[11px] text-muted-foreground">Başlıq</label>
                <input value={notifyTitle} onChange={e => setNotifyTitle(e.target.value)} placeholder="Məs: KPI yeniləməsi tələb olunur"
                  className="w-full mt-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Mesaj</label>
                <textarea value={notifyMsg} onChange={e => setNotifyMsg(e.target.value)} rows={4} placeholder="Mesaj mətni..."
                  className="w-full mt-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none" />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">Prioritet</label>
                <div className="flex gap-1.5 mt-1">
                  {[["normal", "Normal"], ["important", "Vacib"], ["urgent", "Təcili"]].map(([v, l]) => (
                    <button key={v} onClick={() => setNotifyPri(v)}
                      className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${notifyPri === v ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">Alıcı: <span className="text-foreground font-medium">{node.name}</span></div>
              <Button onClick={sendNotify} className="w-full gap-1.5"><Send className="w-3.5 h-3.5" /> Göndər</Button>
            </div>
          )}

          {tab === "risk" && (
            <div className="mt-3 space-y-3">
              <div className={`rounded-lg border p-3 ${riskColor}`}>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  <div className="text-xs font-semibold">Risk səviyyəsi: {riskLabel}</div>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs font-semibold text-foreground mb-2">Risk səbəbləri</div>
                <ul className="space-y-1.5 text-sm">
                  {(node.riskReasons ?? ["Deadline gecikməsi", "Plan geriliyi", "Məlumat daxil edilməyib"]).map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs font-semibold text-foreground mb-1">Rəhbər qeydi</div>
                <p className="text-sm text-muted-foreground">{node.managerNote ?? "Rəhbər qeydi qeyd edilməyib."}</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <TargetIcon className="w-3.5 h-3.5 text-primary" /> Tövsiyə olunan tədbirlər
                </div>
                <ul className="space-y-1.5 text-sm text-foreground">
                  <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-primary mt-1 shrink-0" /> Həftəlik status görüşü təyin et</li>
                  <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-primary mt-1 shrink-0" /> Plan-fakt fərqinə görə qısamüddətli tədbir planı</li>
                  <li className="flex items-start gap-2"><Check className="w-3.5 h-3.5 text-primary mt-1 shrink-0" /> Əlavə resurs və ya mentorluq təyin et</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

// ============================================================
// CARD TARGETS DRAWER — Bir KPI kartına aid hədəflər siyahısı
// ============================================================
interface CardTarget {
  id: string;
  name: string;
  plan: number;
  fakt: number;
  unit: string;
  weight: number;
  status: KpiStatus;
}

const TARGET_NAMES = [
  "Yeni müştəri qazanılması",
  "Mövcud müştərilərin saxlanılması",
  "Kross-satış həcmi",
  "Kanallar üzrə satış",
  "Kampaniya effektivliyi",
];

const buildCardTargets = (cardId: string, planTotal: number, unit: string): CardTarget[] => {
  const h = hashStr(`ct-${cardId}`);
  const count = 3 + (h % 2); // 3 or 4 targets
  const weights: number[] = [];
  let remaining = 100;
  for (let i = 0; i < count; i++) {
    const w = i === count - 1 ? remaining : Math.max(15, Math.round((remaining / (count - i)) + (((h >> (i * 3)) % 10) - 5)));
    weights.push(w);
    remaining -= w;
  }
  return Array.from({ length: count }).map((_, i) => {
    const hh = hashStr(`ct-${cardId}-${i}`);
    const plan = Math.max(1, Math.round((planTotal * weights[i]) / 100));
    const ratio = 0.55 + ((hh % 50) / 100);
    const fakt = Math.round(plan * ratio);
    const pct = Math.round((fakt / plan) * 100);
    const status: KpiStatus = pct >= 100 ? "completed" : pct >= 90 ? "in_progress" : pct >= 75 ? "at_risk" : "delayed";
    return {
      id: `${cardId}-t${i}`,
      name: TARGET_NAMES[(hh + i) % TARGET_NAMES.length],
      plan, fakt, unit, weight: weights[i], status,
    };
  });
};

const CardTargetsDrawer = ({ data, onClose, onOpenTarget }: {
  data: { card: Kpi & { progress: number; createdAt: string; updatedAt: string }; employee: { empId: number; name: string; position?: string; division?: string } } | null;
  onClose: () => void;
  onOpenTarget: (t: CardTarget) => void;
}) => {
  if (!data) return null;
  const { card, employee } = data;
  const targets = buildCardTargets(card.id, card.target, card.unit);
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-30 animate-in fade-in" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-screen w-full sm:w-[640px] bg-card border-l border-border shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate">{withKartSuffix(card.name)}</h3>
            <p className="text-xs text-muted-foreground truncate">{employee.name} · {employee.position || "—"}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md hover:bg-secondary inline-flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Card meta */}
          <div className="rounded-xl border border-border bg-background p-4 mb-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <MetaRow label="Dövr" value={card.period} />
            <MetaRow label="Status" value={<Badge className={statusMeta[card.status].cls}>{statusMeta[card.status].label}</Badge>} />
            <MetaRow label="Departament / Şöbə" value={employee.division || "—"} />
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Ümumi icra</div>
              <div className="flex items-center gap-2">
                <Progress value={Math.min(card.progress, 100)} className="h-1.5 flex-1" />
                <span className="text-xs font-medium tabular-nums">{card.progress}%</span>
              </div>
            </div>
          </div>

          {/* Targets list */}
          <div className="text-sm font-semibold text-foreground mb-2">Hədəflər</div>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-secondary/40 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Hədəf</th>
                  <th className="text-right px-3 py-2 font-medium">Plan</th>
                  <th className="text-right px-3 py-2 font-medium">Fakt</th>
                  <th className="text-left px-3 py-2 font-medium w-24">İcra %</th>
                  <th className="text-center px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium w-12">Bax</th>
                </tr>
              </thead>
              <tbody>
                {targets.map(t => {
                  const pct = Math.round((t.fakt / t.plan) * 100);
                  const bar = pct >= 100 ? "bg-emerald-500" : pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-amber-500" : "bg-rose-500";
                  return (
                    <tr key={t.id} className="border-t border-border align-top hover:bg-secondary/20">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground">{t.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Çəki: {t.weight}%</div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmt(t.plan)} {t.unit}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmt(t.fakt)} {t.unit}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className={`h-full ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="tabular-nums font-medium w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge className={`${statusMeta[t.status].cls} text-[10px] px-1.5 py-0.5`}>{statusMeta[t.status].label}</Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => onOpenTarget(t)}
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="Hədəfə bax"
                          title="Tarixçə, şərhlər, xatırlatmalar"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </aside>
    </>
  );
};

// ============================================================
// TARGET DETAIL DRAWER — Bir hədəfə aid tarixçə / şərhlər / xatırlat.
// ============================================================
type TargetDrawerTab = "general" | "execution" | "fact" | "evaluation" | "history" | "review" | "comments" | "attachments" | "performance";
const TargetDetailDrawer = ({ data, onClose, tabsFilter }: {
  data: { cardId: string; cardName: string; target: CardTarget } | null;
  onClose: () => void;
  tabsFilter?: TargetDrawerTab[];
}) => {
  const initialTab: TargetDrawerTab = (tabsFilter && tabsFilter[0]) || "general";
  const [tab, setTab] = useState<TargetDrawerTab>(initialTab);
  const [draft, setDraft] = useState("");
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({});

  useEffect(() => {
    if (data && !commentsMap[data.target.id]) {
      setCommentsMap(m => ({ ...m, [data.target.id]: initialComments(data.target.id) }));
    }
  }, [data, commentsMap]);

  if (!data) return null;
  const { target, cardName } = data;
  const history = initialHistory(target.id);
  const reminders = initialReminders(target.id);
  const comments = commentsMap[target.id] || [];
  const pct = Math.round((target.fakt / target.plan) * 100);

  const sendComment = () => {
    const t = draft.trim();
    if (!t) return;
    const now = new Date();
    const stamp = `${String(now.getDate()).padStart(2,"0")}.${String(now.getMonth()+1).padStart(2,"0")}.${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const item: CommentItem = { id: `${target.id}-c${Date.now()}`, author: "Siz", role: "İstifadəçi", date: stamp, text: t };
    setCommentsMap(m => ({ ...m, [target.id]: [...(m[target.id] || []), item] }));
    setDraft("");
    toast({ title: "Şərh göndərildi" });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-in fade-in" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-screen w-full sm:w-[520px] bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{target.name}</h3>
            <p className="text-[11px] text-muted-foreground truncate">{withKartSuffix(cardName)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md hover:bg-secondary inline-flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-border grid grid-cols-4 gap-2 text-center">
          <div><div className="text-[10px] text-muted-foreground">Plan</div><div className="text-sm font-semibold tabular-nums">{fmt(target.plan)}</div></div>
          <div><div className="text-[10px] text-muted-foreground">Fakt</div><div className="text-sm font-semibold tabular-nums">{fmt(target.fakt)}</div></div>
          <div><div className="text-[10px] text-muted-foreground">İcra %</div><div className="text-sm font-semibold tabular-nums">{pct}%</div></div>
          <div><div className="text-[10px] text-muted-foreground">Status</div><Badge className={`${statusMeta[target.status].cls} text-[10px]`}>{statusMeta[target.status].label}</Badge></div>
        </div>

        <div className="px-4 pt-3 flex-1 overflow-hidden flex flex-col">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex flex-col flex-1 min-h-0">
            {(() => {
              const ALL_TABS: [typeof tab, string][] = [
                ["general", "Ümumi"], ["execution", "İcra"], ["fact", "Fakt"],
                ["evaluation", "Qiymət."], ["history", "Tarixçə"], ["review", "Review"],
                ["comments", "Şərhlər"], ["performance", "Performans"], ["attachments", "Əlavələr"],
              ];
              const visible = ALL_TABS.filter(([k]) => !tabsFilter || tabsFilter.includes(k));
              return (
                <TabsList className={`w-full grid mb-3 h-auto`} style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}>
                  {visible.map(([k, l]) => (
                    <TabsTrigger key={k} value={k} className="text-[10px] px-1">{l}</TabsTrigger>
                  ))}
                </TabsList>
              );
            })()}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4">

              <TabsContent value="general" className="mt-0">
                <div className="rounded-xl border border-border p-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <MetaRow label="Hədəfin adı" value={target.name} />
                  <MetaRow label="KPI kartı" value={withKartSuffix(cardName)} />
                  <MetaRow label="Status" value={<Badge className={`${statusMeta[target.status].cls} text-[10px]`}>{statusMeta[target.status].label}</Badge>} />
                  <MetaRow label="Plan" value={`${fmt(target.plan)} ${target.unit}`} />
                  <MetaRow label="Fakt" value={`${fmt(target.fakt)} ${target.unit}`} />
                  <MetaRow label="Cari nəticə" value={`${pct}%`} />
                  <MetaRow label="Progress" value={<div className="flex items-center gap-1.5"><div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(pct, 100)}%` }} /></div><span className="tabular-nums">{pct}%</span></div>} />
                  <MetaRow label="Çəki" value={`${target.weight}%`} />
                  <MetaRow label="Son qiymətləndirmə" value={`${(pct / 20).toFixed(1)} / 5`} />
                </div>
              </TabsContent>

              <TabsContent value="execution" className="mt-0">
                <div className="rounded-xl border border-border p-3 space-y-2 text-xs">
                  <MetaRow label="İcra vəziyyəti" value="Davam edir" />
                  <MetaRow label="Başlanma tarixi" value={history[0]?.date || "—"} />
                  <MetaRow label="Son yenilənmə" value={history[history.length - 1]?.date || "—"} />
                  <MetaRow label="Məsul şəxs" value="—" />
                </div>
              </TabsContent>

              <TabsContent value="fact" className="mt-0">
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Tarix</th>
                        <th className="text-right px-3 py-2 font-medium">Plan</th>
                        <th className="text-right px-3 py-2 font-medium">Fakt</th>
                        <th className="text-right px-3 py-2 font-medium">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 4).map((h, i) => {
                        const plan = Math.round(target.plan / 4);
                        const fakt = Math.round(target.fakt / (4 - i * 0.5));
                        return (
                          <tr key={h.id} className="border-t border-border">
                            <td className="px-3 py-2">{h.date}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmt(plan)}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{fmt(fakt)}</td>
                            <td className={`px-3 py-2 text-right tabular-nums ${fakt >= plan ? "text-emerald-600" : "text-rose-600"}`}>{fakt >= plan ? "+" : ""}{fmt(fakt - plan)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="evaluation" className="mt-0">
                <div className="rounded-xl border border-border p-3 space-y-2 text-xs">
                  <MetaRow label="Qiymətləndirici" value="Rəhbər" />
                  <MetaRow label="Bal" value={`${(pct / 20).toFixed(1)} / 5`} />
                  <MetaRow label="Nəticə" value={pct >= 90 ? "Əla" : pct >= 75 ? "Yaxşı" : "Təkmilləşdirilməli"} />
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <ol className="relative border-l-2 border-border pl-4 space-y-4">
                  {history.map(h => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[9px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/15" />
                      <div className="text-[11px] text-muted-foreground">{h.date} {h.time}</div>
                      <div className="text-sm font-medium text-foreground">{h.author}</div>
                      <div className="text-xs text-muted-foreground">
                        {h.field}: <span className="text-foreground">{h.from}</span> → <span className="text-primary font-medium">{h.to}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </TabsContent>

              <TabsContent value="review" className="mt-0 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-foreground mb-1.5">Review Timeline</div>
                  <ol className="relative border-l-2 border-border pl-4 space-y-3">
                    {[
                      { d: "01.06.2025 09:00", a: "Sistem", t: "Review yaradıldı" },
                      { d: "05.06.2025 10:30", a: "Rəhbər", t: "Review başladı" },
                      { d: "10.06.2025 14:20", a: "Rəhbər", t: "Qeyd əlavə etdi: Plan üzrə irəliləyir." },
                      { d: "12.06.2025 11:15", a: "Əməkdaş", t: "Cavab verdi: Növbəti həftə əlavə plan hazırlanır." },
                    ].map((x, i) => (
                      <li key={i} className="relative">
                        <span className="absolute -left-[9px] top-1 w-3 h-3 rounded-full bg-sky-500 ring-4 ring-sky-500/15" />
                        <div className="text-[11px] text-muted-foreground">{x.d}</div>
                        <div className="text-sm font-medium text-foreground">{x.a}</div>
                        <div className="text-xs text-muted-foreground">{x.t}</div>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="rounded-xl border border-border p-3 space-y-2 text-xs">
                  <MetaRow label="Qiymətləndiricinin qeydi" value="Yeni müştəri hədəfi üzrə bir qədər gecikmə var. Növbəti həftə əlavə plan hazırlansın." />
                  <MetaRow label="Əməkdaşın cavabı" value="Yeni kampaniyaya start verilib. Gələn həftə nəticələr yaxşılaşacaq." />
                  <MetaRow label="Review qərarı" value={<Badge className="bg-sky-500/15 text-sky-700">Davam edir</Badge>} />
                  <MetaRow label="Növbəti Review tarixi" value="22.06.2025" />
                </div>
              </TabsContent>

              <TabsContent value="comments" className="mt-0">
                <div className="space-y-2.5">
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex-shrink-0 flex items-center justify-center text-xs font-semibold">
                        {c.author.split(" ").map(x => x[0]).join("").slice(0,2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs"><span className="font-medium text-foreground">{c.author}</span><span className="text-muted-foreground"> · {c.date}</span></div>
                        <div className="mt-1 text-sm text-foreground rounded-lg bg-secondary/50 border border-border px-3 py-2">{c.text}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="attachments" className="mt-0">
                <ul className="space-y-2 text-xs">
                  {["Review_Report.pdf", "Satış_Hesabatı.xlsx", "Bonus_Hesabatı.pdf"].map(f => (
                    <li key={f} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border hover:bg-secondary/30">
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-foreground">{f}</span>
                      </div>
                      <button className="text-primary hover:underline">Yüklə</button>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            </div>
          </Tabs>

          {tab === "comments" && (
            <div className="border-t border-border pt-3 pb-4 flex items-center gap-2">
              <input value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); } }}
                placeholder="Şərhinizi yazın..."
                className="flex-1 px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              <Button size="sm" onClick={sendComment} className="gap-1"><Send className="w-3.5 h-3.5" /> Göndər</Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};


// ============================================================
// REVIEWS VIEW — Lifecycle Status = Review olan KPI kartları
// ============================================================
type ReviewRow = {
  key: string;
  cardId: number;
  reviewId: string;
  cardName: string;
  empId: number | null;
  empName: string;
  department: string;
  division: string;
  position: string;
  progress: number;
  reviewLabel: string;
  reviewStart: string;
  reviewEnd: string;
  reviewStatus: ReviewComputedStatus;
  outcomeComment?: string;
  updatedAt: string;
  execution: ExecutionStatus | null;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const fmtDate = (s?: string) => {
  if (!s) return "—";
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
};
const progressFromExec = (e: ExecutionStatus | null): number => {
  switch (e) {
    case "tamamlandi": return 100;
    case "icrada": return 60;
    case "gecikme": return 30;
    default: return 0;
  }
};
const execLabel: Record<ExecutionStatus, { label: string; cls: string }> = {
  baslanmayib: { label: "Başlanmayıb", cls: "bg-secondary text-secondary-foreground" },
  icrada: { label: "İcradadır", cls: "bg-zone-yellow-bg text-zone-yellow-text" },
  tamamlandi: { label: "Tamamlandı", cls: "bg-zone-green-bg text-zone-green-text" },
  gecikme: { label: "Gecikir", cls: "bg-zone-red-bg text-zone-red-text" },
};

const useReviewRows = (): ReviewRow[] => {
  const lifecycles = useKpiLifecycles();
  const sharedCards = useSharedKpiCards();
  return useMemo(() => {
    const today = iso(new Date());
    const employees = getEmployees();
    const rows: ReviewRow[] = [];

    const isActive = (r: LifecycleReview) => r.start && r.end && r.start <= today && today <= r.end;

    // Deterministic fallbacks (demo data) when structure or execution is missing
    const DEPARTMENTS = ["Satış Departamenti", "Marketinq Departamenti", "Maliyyə Departamenti", "İnsan Resursları", "Əməliyyat Departamenti"];
    const DIVISIONS = ["Korporativ Satış", "Rəqəmsal Marketinq", "Büdcə və Analiz", "İşə qəbul", "Logistika"];
    const POSITIONS = ["Baş mütəxəssis", "Aparıcı mütəxəssis", "Menecer", "Koordinator", "Mütəxəssis"];
    const PROGRESSES = [42, 58, 65, 73, 81, 35, 90, 55, 47, 68];
    const EXECS: ExecutionStatus[] = ["icrada", "icrada", "gecikme", "tamamlandi", "icrada"];
    const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length];

    lifecycles.forEach((lc: CardLifecycle) => {
      if (!lc.reviews || lc.reviews.length === 0) return;
      const active = lc.reviews.find(isActive)
        ?? [...lc.reviews].sort((a, b) => (a.start || "").localeCompare(b.start || ""))[0];
      if (!active) return;
      const reviewStatus = computeReviewStatus(active);

      const sharedCard: SharedKpiCard | undefined = sharedCards.find(c => c.numericId === lc.cardId);
      const assigneeIds = sharedCard?.assigneeIds ?? [];

      if (assigneeIds.length === 0) {
        const seed = lc.cardId;
        const exec = pick(EXECS, seed);
        rows.push({
          key: `${lc.cardId}-none`,
          cardId: lc.cardId,
          reviewId: active.id,
          cardName: lc.cardName,
          empId: null,
          empName: "—",
          department: pick(DEPARTMENTS, seed),
          division: pick(DIVISIONS, seed + 1),
          position: pick(POSITIONS, seed + 2),
          progress: pick(PROGRESSES, seed),
          reviewLabel: active.period || "Review",
          reviewStart: fmtDate(active.start),
          reviewEnd: fmtDate(active.end),
          reviewStatus,
          outcomeComment: active.outcomeComment,
          updatedAt: (lc.updatedAt || "").slice(0, 10) ? fmtDate((lc.updatedAt || "").slice(0, 10)) : fmtDate(active.start),
          execution: exec,
        });
        return;
      }

      assigneeIds.forEach((aid, idx) => {
        const empIdNum = Number(String(aid).replace(/^e/, ""));
        const emp = employees.find(e => e.id === empIdNum);
        const path = (emp?.structurePath || "").split("›").map(s => s.trim()).filter(Boolean);
        const seed = lc.cardId + idx + empIdNum;
        const execRaw: ExecutionStatus | null | undefined = sharedCard?.execution?.[aid];
        const exec: ExecutionStatus = execRaw && execRaw !== "baslanmayib" ? execRaw : pick(EXECS, seed);
        const progress = execRaw && execRaw !== "baslanmayib" ? progressFromExec(exec) : pick(PROGRESSES, seed);
        rows.push({
          key: `${lc.cardId}-${aid}`,
          cardId: lc.cardId,
          reviewId: active.id,
          cardName: lc.cardName,
          empId: emp?.id ?? null,
          empName: emp ? `${emp.firstName} ${emp.lastName}` : String(aid),
          department: path[0] || pick(DEPARTMENTS, seed),
          division: path[1] || pick(DIVISIONS, seed + 1),
          position: emp?.positionName || pick(POSITIONS, seed + 2),
          progress,
          reviewLabel: active.period || "Review",
          reviewStart: fmtDate(active.start),
          reviewEnd: fmtDate(active.end),
          reviewStatus,
          outcomeComment: active.outcomeComment,
          updatedAt: (lc.updatedAt || "").slice(0, 10) ? fmtDate((lc.updatedAt || "").slice(0, 10)) : fmtDate(active.start),
          execution: exec,
        });
      });
    });

    return rows;
  }, [lifecycles, sharedCards]);
};

const ReviewsCount = () => {
  const rows = useReviewRows();
  return <>{rows.length}</>;
};

const ReviewsView = () => {
  const rows = useReviewRows();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [overview, setOverview] = useState<{ row: ReviewRow; data: ReviewOverviewData } | null>(null);
  const [statusDialog, setStatusDialog] = useState<{ row: ReviewRow } | null>(null);
  const [targetDetail, setTargetDetail] = useState<{ cardId: string; cardName: string; target: CardTarget } | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      r.cardName.toLowerCase().includes(s) ||
      r.empName.toLowerCase().includes(s) ||
      r.department.toLowerCase().includes(s) ||
      r.division.toLowerCase().includes(s) ||
      r.position.toLowerCase().includes(s),
    );
  }, [rows, q]);

  const toOverviewStatus = (s: ReviewComputedStatus): ReviewStatusValue =>
    s === "held" ? "held" : s === "deferred" ? "deferred" : s === "missed" ? "missed" : "in_progress";

  const buildOverviewData = (r: ReviewRow): ReviewOverviewData => {
    const NOTES = ["Plan üzrə irəliləyir.", "Yaxşı nəticə göstərilir.", "Təkmilləşdirmə tələb olunur.", "Review dövrü bitib, lakin qiymətləndirmə aparılmayıb.", "Plan üzrə irəliləyir.", "Review təxirə salındı."];
    const buckets = buildCardTargets(r.key, 100, "%");
    const targets = buckets.map((t, i) => {
      const pct = Math.round((t.fakt / t.plan) * 100);
      // Vary statuses across targets so the summary strip has meaningful numbers
      const cycle: ReviewStatusValue[] = ["held", "in_progress", "held", "missed", "in_progress", "deferred"];
      const st: ReviewStatusValue = pct >= 100 ? "held" : pct < 65 ? cycle[i % cycle.length] : cycle[(i + 1) % cycle.length];
      return { name: t.name, progress: pct, status: st, lastScore: `${(pct / 20).toFixed(1)} / 5`, note: NOTES[i % NOTES.length] };
    });
    return {
      reviewType: r.reviewLabel,
      planDate: r.reviewStart,
      nextReviewDate: "22.06.2025",
      updatedAt: `${r.updatedAt}   14:30`,
      status: toOverviewStatus(r.reviewStatus),
      overallProgress: r.progress,
      reviewers: [
        { name: "Elvin Məmmədov", position: "Satış şöbəsinin rəhbəri", badge: "Birbaşa rəhbər" },
        { name: "Aysel Məmmədova", position: "HR Business Partner", badge: "HR" },
      ],
      targets,
    };
  };

  const openOverview = (r: ReviewRow) => setOverview({ row: r, data: buildOverviewData(r) });

  const saveStatus = (v: { status: ReviewStatusValue; comment: string }) => {
    if (!statusDialog) return;
    setReviewOutcome(statusDialog.row.cardId, statusDialog.row.cardName, undefined, statusDialog.row.reviewId, {
      status: v.status,
      comment: v.comment,
      by: user?.name || "Rəhbər",
    });
    toast({ title: "Review statusu yeniləndi" });
    setStatusDialog(null);
    // Refresh overview data if the dialog was opened from it
    if (overview && overview.row.reviewId === statusDialog.row.reviewId) {
      setOverview({ row: overview.row, data: { ...overview.data, status: v.status } });
    }
  };

  return (
    <>
      <PageHero badge="Rəhbər Paneli" icon={RefreshCw} title="Reviewlar" subtitle="Hazırda Review mərhələsində olan bütün KPI kartlarının vahid izləmə cədvəli." />

      <div className="rounded-xl border border-border bg-card p-3 mb-3 flex items-center gap-3 flex-wrap mt-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="KPI, əməkdaş, departament, şöbə və ya vəzifə üzrə axtarış..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Badge className="bg-sky-500/15 text-sky-700 hover:bg-sky-500/15">Review: {filtered.length}</Badge>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-medium">KPI Kartının adı</th>
                <th className="text-left px-4 py-3 font-medium">Departament</th>
                <th className="text-left px-4 py-3 font-medium">Şöbə</th>
                <th className="text-left px-4 py-3 font-medium">Vəzifə</th>
                <th className="text-left px-4 py-3 font-medium w-[180px]">Progress</th>
                <th className="text-left px-4 py-3 font-medium">Review statusu</th>
                <th className="text-left px-4 py-3 font-medium">Review başlanma</th>
                <th className="text-left px-4 py-3 font-medium">Son yenilənmə</th>
                <th className="text-right px-4 py-3 font-medium">Əməliyyat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Hazırda Review mərhələsində olan KPI kartı yoxdur.
                  </td>
                </tr>
              ) : filtered.map(r => {
                const reviewStyle = REVIEW_STATUS_STYLES[r.reviewStatus];
                const ReviewIcon = reviewStyle.badgeIcon;
                return (
                  <tr key={r.key} className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-medium text-foreground">{withKartSuffix(r.cardName)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.department}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.division}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.position}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={r.progress} className="h-2 flex-1" />
                        <span className="text-xs tabular-nums font-medium w-9 text-right">{r.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <Badge className={`${reviewStyle.badge} inline-flex items-center gap-1`}><ReviewIcon className="w-3 h-3" />{reviewStyle.badgeLabel}</Badge>
                        {r.outcomeComment && (
                          <div className="text-[11px] text-muted-foreground max-w-[220px] truncate" title={r.outcomeComment}>
                            {r.reviewStatus === "deferred" ? "Səbəb" : "Şərh"}: {r.outcomeComment}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.reviewStart}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.updatedAt}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openOverview(r)}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Bax"
                        title="Review-a bax"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {overview && (
        <ReviewOverviewDialog
          open={!!overview}
          onOpenChange={(o) => !o && setOverview(null)}
          title={withKartSuffix(overview.row.cardName)}
          data={overview.data}
          onChangeStatus={() => setStatusDialog({ row: overview.row })}
          onOpenTarget={(idx) => {
            const t = buildCardTargets(overview.row.key, 100, "%")[idx];
            if (t) setTargetDetail({ cardId: overview.row.key, cardName: overview.row.cardName, target: t });
          }}
        />
      )}

      <TargetDetailDrawer data={targetDetail} onClose={() => setTargetDetail(null)} tabsFilter={["review", "comments", "performance"]} />

      <ReviewStatusChangeDialog
        open={!!statusDialog}
        onOpenChange={(o) => !o && setStatusDialog(null)}
        currentStatus={statusDialog ? toOverviewStatus(statusDialog.row.reviewStatus) : "in_progress"}
        onSave={saveStatus}
      />
    </>
  );
};

export default ManagerKpiTrackingPage;



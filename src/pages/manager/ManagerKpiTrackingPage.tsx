// Rəhbər · KPI İzlənməsi — 3 kart: Mənim KPI-larım / Komanda KPI-ları / Tabeçilikdəkilərin KPI-ları.
import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Activity, User, Users, Network, ChevronLeft, ChevronRight, Search, Bell, Check, X, Clock,
} from "lucide-react";

type Stage = "assigned" | "evaluated" | "pending_assign";
interface Kpi { id: string; name: string; period: string; target: number; actual: number; unit: string; stage: Stage; }
interface Person { id: string; name: string; position: string; parent?: string; level: number; assigned: boolean; stage: Stage; }

const MY_KPIS: Kpi[] = [
  { id: "k1", name: "Departament satış həcmi", period: "Q1 2026", target: 500_000, actual: 380_000, unit: "AZN", stage: "assigned" },
  { id: "k2", name: "Yeni müştəri əldə etmə", period: "Q1 2026", target: 40, actual: 27, unit: "ədəd", stage: "assigned" },
  { id: "k3", name: "Komanda təlim iştirakı", period: "Q4 2025", target: 100, actual: 100, unit: "%", stage: "evaluated" },
];

const TEAM_KPIS: Kpi[] = [
  { id: "t1", name: "Komanda satış həcmi (toplu)", period: "Q1 2026", target: 1_500_000, actual: 1_120_000, unit: "AZN", stage: "assigned" },
  { id: "t2", name: "Brand kampaniya reach (toplu)", period: "Q1 2026", target: 500_000, actual: 342_000, unit: "istifadəçi", stage: "assigned" },
  { id: "t3", name: "NPS orta bal (toplu)", period: "Q4 2025", target: 70, actual: 72, unit: "bal", stage: "evaluated" },
];

// Hierarchy: manager (level 0, self) → direct (level 1) → indirect (level 2, 3...)
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
        {view === "own" && <KpiListView title="Mənim KPI-larım" icon={User} data={MY_KPIS} />}
        {view === "team" && <KpiListView title="Komanda KPI-ları" icon={Users} data={TEAM_KPIS} />}
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

const KpiListView = ({ title, icon: Icon, data }: { title: string; icon: any; data: Kpi[] }) => (
  <>
    <PageHero badge="Rəhbər Paneli" icon={Icon} title={title} subtitle="Hər hədəf üzrə icra vəziyyəti və dövrü." />
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Hədəf</th>
            <th className="text-left px-4 py-3 font-medium">Dövr</th>
            <th className="text-right px-4 py-3 font-medium">Hədəf</th>
            <th className="text-right px-4 py-3 font-medium">Faktiki</th>
            <th className="text-right px-4 py-3 font-medium">İcra %</th>
            <th className="text-center px-4 py-3 font-medium">Mərhələ</th>
          </tr>
        </thead>
        <tbody>
          {data.map(k => {
            const p = pctOf(k);
            return (
              <tr key={k.id} className="border-t border-border hover:bg-secondary/20">
                <td className="px-4 py-3 font-medium text-foreground">{k.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{k.period}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(k.target)} {k.unit}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(k.actual)} {k.unit}</td>
                <td className="px-4 py-3 text-right"><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums ${tone(p)}`}>{p}%</span></td>
                <td className="px-4 py-3 text-center">
                  {k.stage === "evaluated" ? (
                    <Badge className="bg-zone-green-bg text-zone-green-text hover:bg-zone-green-bg">Qiymətləndirilib</Badge>
                  ) : (
                    <Badge className="bg-zone-yellow-bg text-zone-yellow-text hover:bg-zone-yellow-bg">Təyin edilib</Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </>
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

  return (
    <>
      <PageHero badge="Rəhbər Paneli" icon={Network} title="Tabeçiliyimdəkilərin KPI-ları" subtitle="Default: 1-ci səviyyə. Səviyyəni artıraraq daha dərin izləmə edə bilərsiniz." />

      <div className="rounded-xl border border-border bg-card p-3 mb-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Əməkdaş axtar (məs. Tural Məmmədzadə)..." className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Səviyyə:
          {[1, 2, 3, 4, 5].map(l => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`w-7 h-7 rounded-md border text-xs font-medium transition-colors ${level === l ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}
            >{l}</button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Əməkdaş</th>
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
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">Əməkdaş tapılmadı.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ManagerKpiTrackingPage;

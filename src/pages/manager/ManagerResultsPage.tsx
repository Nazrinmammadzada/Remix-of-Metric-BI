// Rəhbər · Nəticələrim — 3 kart (Fərdi / Komanda / Tabeçilik), hər birində 2 tab (Davam edən / Yekunlaşmış).
import { useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, User, Users, Network, ChevronLeft, ChevronRight, CheckCircle2, Loader2,
} from "lucide-react";

type Status = "in_progress" | "done";
interface Result {
  id: string;
  name: string;
  target: number;
  actual: number;
  unit: string;
  period: string;
  status: Status;
  owner?: string;
}

const fmt = (n: number) => new Intl.NumberFormat("az-AZ").format(n);
const pct = (r: Result) => (r.target ? Math.round((r.actual / r.target) * 100) : 0);
const tone = (p: number) => p >= 100 ? "bg-zone-green-bg text-zone-green-text" : p >= 75 ? "bg-zone-yellow-bg text-zone-yellow-text" : "bg-zone-red-bg text-zone-red-text";

const MY_RESULTS: Result[] = [
  { id: "m1", name: "Departament satış həcmi", target: 500_000, actual: 380_000, unit: "AZN", period: "Q1 2026", status: "in_progress" },
  { id: "m2", name: "Yeni müştəri əldə etmə", target: 40, actual: 27, unit: "ədəd", period: "Q1 2026", status: "in_progress" },
  { id: "m3", name: "Komandada təlim iştirakı", target: 100, actual: 100, unit: "%", period: "Q4 2025", status: "done" },
  { id: "m4", name: "Aylıq satış hədəfi (Yanvar)", target: 120_000, actual: 132_000, unit: "AZN", period: "Yanvar 2026", status: "done" },
];

const TEAM_RESULTS: Result[] = [
  { id: "t1", name: "Komanda satış həcmi", target: 1_500_000, actual: 1_120_000, unit: "AZN", period: "Q1 2026", status: "in_progress", owner: "Marketinq komandası" },
  { id: "t2", name: "Brand kampaniya reach", target: 500_000, actual: 342_000, unit: "istifadəçi", period: "Q1 2026", status: "in_progress", owner: "Marketinq komandası" },
  { id: "t3", name: "NPS orta bal", target: 70, actual: 72, unit: "bal", period: "Q4 2025", status: "done", owner: "Marketinq komandası" },
];

const SUB_RESULTS: Result[] = [
  { id: "s1", name: "Kamran Quliyev — Rəqəmsal marketinq ROI", target: 200, actual: 165, unit: "%", period: "Q1 2026", status: "in_progress", owner: "Kamran Quliyev" },
  { id: "s2", name: "Orxan Bayramov — Kampaniya sayı", target: 12, actual: 9, unit: "ədəd", period: "Q1 2026", status: "in_progress", owner: "Orxan Bayramov" },
  { id: "s3", name: "Aynur Cəfərova — Brand awareness", target: 40, actual: 44, unit: "%", period: "Q4 2025", status: "done", owner: "Aynur Cəfərova" },
  { id: "s4", name: "Aytac Kərimova — Sosial media follower artımı", target: 15000, actual: 15800, unit: "izləyici", period: "Q4 2025", status: "done", owner: "Aytac Kərimova" },
];

type View = "hub" | "own" | "team" | "sub";

const ManagerResultsPage = () => {
  const [view, setView] = useState<View>("hub");
  return (
    <div className="min-h-screen">
      <Header title="Nəticələrim" />
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
              badge="Rəhbər Paneli"
              icon={Trophy}
              title="Nəticələrim"
              subtitle="Fərdi, komanda və tabeçilik üzrə nəticələri izləyin."
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
              <HubCard icon={User} title="Fərdi nəticələrim" subtitle="Sizin şəxsi hədəfləriniz üzrə nəticələr." count={MY_RESULTS.length} gradient="from-indigo-500/15 via-indigo-500/5 to-transparent border-indigo-400/40" onClick={() => setView("own")} />
              <HubCard icon={Users} title="Komanda nəticələri" subtitle="Komanda olaraq toplu hədəflərin nəticələri." count={TEAM_RESULTS.length} gradient="from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-400/40" onClick={() => setView("team")} />
              <HubCard icon={Network} title="Tabeçiliyimdəki nəticələr" subtitle="Tabeliyinizdəki şəxslərin nəticələri." count={SUB_RESULTS.length} gradient="from-amber-500/15 via-amber-500/5 to-transparent border-amber-400/40" onClick={() => setView("sub")} />
            </div>
          </>
        )}

        {view === "own" && <ResultsView title="Fərdi nəticələrim" icon={User} data={MY_RESULTS} />}
        {view === "team" && <ResultsView title="Komanda nəticələri" icon={Users} data={TEAM_RESULTS} />}
        {view === "sub" && <ResultsView title="Tabeçiliyimdəki nəticələr" icon={Network} data={SUB_RESULTS} showOwner />}
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
      <span className="text-xs px-2.5 py-1 rounded-full bg-white/80 border border-white text-foreground/70 font-medium">{count} nəticə</span>
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
    <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground/70 group-hover:text-foreground">
      Aç <ChevronRight className="w-4 h-4" />
    </div>
  </button>
);

const ResultsView = ({ title, icon: Icon, data, showOwner }: { title: string; icon: any; data: Result[]; showOwner?: boolean }) => {
  const inProgress = data.filter(r => r.status === "in_progress");
  const done = data.filter(r => r.status === "done");
  return (
    <>
      <PageHero badge="Rəhbər Paneli" icon={Icon} title={title} subtitle="Yekunlaşmış və hal-hazırda davam edən nəticələr." />
      <Tabs defaultValue="ongoing" className="w-full">
        <TabsList>
          <TabsTrigger value="ongoing" className="gap-1.5"><Loader2 className="w-3.5 h-3.5" /> Davam edən ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="done" className="gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Yekunlaşmış ({done.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="ongoing"><ResultsTable data={inProgress} showOwner={showOwner} /></TabsContent>
        <TabsContent value="done"><ResultsTable data={done} showOwner={showOwner} /></TabsContent>
      </Tabs>
    </>
  );
};

const ResultsTable = ({ data, showOwner }: { data: Result[]; showOwner?: boolean }) => {
  if (data.length === 0) {
    return <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">Nəticə yoxdur.</div>;
  }
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3 font-medium">Hədəf</th>
            {showOwner && <th className="text-left px-4 py-3 font-medium">Sahib</th>}
            <th className="text-right px-4 py-3 font-medium">Hədəf</th>
            <th className="text-right px-4 py-3 font-medium">Faktiki</th>
            <th className="text-right px-4 py-3 font-medium">İcra %</th>
            <th className="text-left px-4 py-3 font-medium">Dövr</th>
            <th className="text-center px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map(r => {
            const p = pct(r);
            return (
              <tr key={r.id} className="border-t border-border hover:bg-secondary/20">
                <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                {showOwner && <td className="px-4 py-3 text-muted-foreground">{r.owner || "—"}</td>}
                <td className="px-4 py-3 text-right tabular-nums">{fmt(r.target)} {r.unit}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(r.actual)} {r.unit}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums ${tone(p)}`}>{p}%</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.period}</td>
                <td className="px-4 py-3 text-center">
                  {r.status === "done" ? (
                    <Badge className="bg-zone-green-bg text-zone-green-text hover:bg-zone-green-bg gap-1"><CheckCircle2 className="w-3 h-3" /> Yekunlaşıb</Badge>
                  ) : (
                    <Badge className="bg-zone-yellow-bg text-zone-yellow-text hover:bg-zone-yellow-bg gap-1"><Loader2 className="w-3 h-3" /> Davam edir</Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ManagerResultsPage;

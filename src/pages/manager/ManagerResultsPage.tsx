// Rəhbər · Nəticələrim — 3 kart (Fərdi / Komanda / Tabeçilik).
// Hər kartın daxili HR-in KPI Nəticələri modulunun eynisi (KpiScoresPage komponenti).
import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Trophy, User, Users, Network, ChevronLeft, ChevronRight } from "lucide-react";
import KpiScoresPage from "@/pages/KpiScoresPage";
import { getEmployees, getSubordinatesOfStarHolder, getStructures } from "@/lib/orgStore";
import { useAuth } from "@/contexts/AuthContext";

type View = "hub" | "own" | "team" | "sub";

const ManagerResultsPage = () => {
  const [view, setView] = useState<View>("hub");
  const { user } = useAuth();

  const { own, team, sub } = useMemo(() => {
    const all = getEmployees().filter(e => e.active);
    const me = all.find(e => e.email === user?.email) || all.find(e => `${e.firstName} ${e.lastName}` === user?.name);
    if (!me) return { own: [], team: [], sub: [] };
    // Marketinq Departamenti komandası
    const teamMembers = all.filter(e => (e.structurePath || "").startsWith(me.structurePath || ""));
    // Bilavasitə tabeliyi tap
    const findUnitId = (): number | null => {
      const walk = (list: any[], path: string[]): number | null => {
        for (const n of list) {
          const cur = [...path, n.name];
          if (cur.join(" › ") === me.structurePath) return n.id;
          const ch = walk(n.children, cur);
          if (ch) return ch;
        }
        return null;
      };
      return walk(getStructures(), []);
    };
    const unitId = findUnitId();
    const subs = unitId ? getSubordinatesOfStarHolder(me.id, unitId) : [];
    return { own: [me], team: teamMembers, sub: subs };
  }, [user?.email, user?.name]);

  return (
    <div className="min-h-screen">
      <Header title="Nəticələrim" />
      <main className="p-6 pb-24">
        {view !== "hub" && (
          <button onClick={() => setView("hub")} className="mb-4 inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary">
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
        )}

        {view === "hub" && (
          <>
            <PageHero badge="Rəhbər Paneli" icon={Trophy} title="Nəticələrim" subtitle="Fərdi, komanda və tabeçilik üzrə KPI nəticələri." />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
              <HubCard icon={User} title="Fərdi nəticələrim" subtitle="Sizin şəxsi KPI nəticələriniz." count={own.length} gradient="from-indigo-500/15 via-indigo-500/5 to-transparent border-indigo-400/40" onClick={() => setView("own")} />
              <HubCard icon={Users} title="Komanda nəticələri" subtitle="Komandanızın KPI nəticələri." count={team.length} gradient="from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-400/40" onClick={() => setView("team")} />
              <HubCard icon={Network} title="Tabeçiliyimdəki nəticələr" subtitle="Tabeliyinizdəki şəxslərin nəticələri." count={sub.length} gradient="from-amber-500/15 via-amber-500/5 to-transparent border-amber-400/40" onClick={() => setView("sub")} />
            </div>
          </>
        )}

        {view === "own" && (
          <>
            <PageHero badge="Rəhbər Paneli" icon={User} title="Fərdi nəticələrim" subtitle="Sizin şəxsi KPI kartları üzrə nəticələr." />
            <KpiScoresPage employeesOverride={own as any} hideChrome />
          </>
        )}
        {view === "team" && (
          <>
            <PageHero badge="Rəhbər Paneli" icon={Users} title="Komanda nəticələri" subtitle="Komandanızın KPI kartları üzrə nəticələri." />
            <KpiScoresPage employeesOverride={team as any} hideChrome />
          </>
        )}
        {view === "sub" && (
          <>
            <PageHero badge="Rəhbər Paneli" icon={Network} title="Tabeçiliyimdəki nəticələr" subtitle="Tabeliyinizdəki şəxslərin KPI nəticələri." />
            <KpiScoresPage employeesOverride={sub as any} hideChrome />
          </>
        )}
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
      <span className="text-xs px-2.5 py-1 rounded-full bg-white/80 border border-white text-foreground/70 font-medium">{count} əməkdaş</span>
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
    <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground/70 group-hover:text-foreground">Aç <ChevronRight className="w-4 h-4" /></div>
  </button>
);

export default ManagerResultsPage;

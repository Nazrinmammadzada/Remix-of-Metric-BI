// Rəhbər · Bonuslarım — 2 kart: Öz bonuslarım / Tabeçiliyimdəkilərin bonusları.
import { useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Badge } from "@/components/ui/badge";
import { Gift, User, Network, ChevronLeft, ChevronRight, CheckCircle2, Clock } from "lucide-react";

interface Bonus {
  id: string;
  employee: string;
  period: string;
  base: number;
  score: number;
  amount: number;
  status: "paid" | "pending";
}

const MY_BONUSES: Bonus[] = [
  { id: "b1", employee: "Sən (Marketinq Direktoru)", period: "Q4 2025", base: 4600, score: 92, amount: 4232, status: "paid" },
  { id: "b2", employee: "Sən (Marketinq Direktoru)", period: "Q1 2026", base: 4600, score: 88, amount: 4048, status: "pending" },
];

const SUB_BONUSES: Bonus[] = [
  { id: "s1", employee: "Kamran Quliyev", period: "Q4 2025", base: 2900, score: 95, amount: 2755, status: "paid" },
  { id: "s2", employee: "Aynur Cəfərova", period: "Q4 2025", base: 2900, score: 82, amount: 2378, status: "paid" },
  { id: "s3", employee: "Orxan Bayramov", period: "Q1 2026", base: 1900, score: 78, amount: 1482, status: "pending" },
  { id: "s4", employee: "Aytac Kərimova", period: "Q1 2026", base: 1900, score: 90, amount: 1710, status: "pending" },
];

const fmt = (n: number) => new Intl.NumberFormat("az-AZ").format(n);
type View = "hub" | "own" | "sub";

const ManagerBonusPage = () => {
  const [view, setView] = useState<View>("hub");
  return (
    <div className="min-h-screen">
      <Header title="Bonuslarım" />
      <main className="p-6 pb-24">
        {view !== "hub" && (
          <button onClick={() => setView("hub")} className="mb-4 inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary">
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
        )}
        {view === "hub" && (
          <>
            <PageHero badge="Rəhbər Paneli" icon={Gift} title="Bonuslarım" subtitle="Şəxsi və tabeçilik bonuslarını izləyin." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
              <HubCard icon={User} title="Öz bonuslarım" subtitle="Sizin fərdi performansınıza görə hesablanmış bonuslar." count={MY_BONUSES.length} gradient="from-indigo-500/15 via-indigo-500/5 to-transparent border-indigo-400/40" onClick={() => setView("own")} />
              <HubCard icon={Network} title="Tabeçiliyimdəkilərin bonusları" subtitle="Tabeliyinizdəki əməkdaşların bonusları." count={SUB_BONUSES.length} gradient="from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-400/40" onClick={() => setView("sub")} />
            </div>
          </>
        )}
        {view === "own" && <BonusView title="Öz bonuslarım" icon={User} data={MY_BONUSES} />}
        {view === "sub" && <BonusView title="Tabeçiliyimdəkilərin bonusları" icon={Network} data={SUB_BONUSES} />}
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
      <span className="text-xs px-2.5 py-1 rounded-full bg-white/80 border border-white text-foreground/70 font-medium">{count} qeyd</span>
    </div>
    <h3 className="text-xl font-semibold text-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
    <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground/70 group-hover:text-foreground">Aç <ChevronRight className="w-4 h-4" /></div>
  </button>
);

const BonusView = ({ title, icon: Icon, data }: { title: string; icon: any; data: Bonus[] }) => {
  const total = data.reduce((s, b) => s + b.amount, 0);
  return (
    <>
      <PageHero badge="Rəhbər Paneli" icon={Icon} title={title} subtitle={`Cəmi bonus: ${fmt(total)} AZN`} />
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Əməkdaş</th>
              <th className="text-left px-4 py-3 font-medium">Dövr</th>
              <th className="text-right px-4 py-3 font-medium">Əsas maaş</th>
              <th className="text-center px-4 py-3 font-medium">Bal</th>
              <th className="text-right px-4 py-3 font-medium">Bonus</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map(b => (
              <tr key={b.id} className="border-t border-border hover:bg-secondary/20">
                <td className="px-4 py-3 font-medium text-foreground">{b.employee}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.period}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmt(b.base)} AZN</td>
                <td className="px-4 py-3 text-center tabular-nums">{b.score}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmt(b.amount)} AZN</td>
                <td className="px-4 py-3 text-center">
                  {b.status === "paid" ? (
                    <Badge className="bg-zone-green-bg text-zone-green-text hover:bg-zone-green-bg gap-1"><CheckCircle2 className="w-3 h-3" /> Ödənilib</Badge>
                  ) : (
                    <Badge className="bg-zone-yellow-bg text-zone-yellow-text hover:bg-zone-yellow-bg gap-1"><Clock className="w-3 h-3" /> Gözləyir</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default ManagerBonusPage;

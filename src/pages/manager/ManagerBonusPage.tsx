// Rəhbər · Bonuslarım — 2 kart: Öz bonuslarım / Tabeçiliyimdəkilərin bonusları.
// Hər 2 kartın daxili HR-in bonuslar modulunun eynisi (BonusPage komponenti).
import { useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Gift, User, Network, ChevronLeft, ChevronRight } from "lucide-react";
import BonusPage, { type Employee } from "@/pages/BonusPage";

// Elvin (Marketinq Direktoru) — öz bonusu
const OWN_EMPLOYEES: Employee[] = [
  {
    id: "e4", firstName: "Elvin", lastName: "Rəhimov", department: "Marketinq Departamenti",
    position: "Marketinq Direktoru", baseSalary: 4600, targetBonusPct: 25,
    subKpis: [
      { name: "Departament satış həcmi",   weight: 40, evaluator: "Farid Həsənov",  score: 92 },
      { name: "Brend kampaniya ROI",        weight: 30, evaluator: "İnteqrasiya (CRM)", score: 88 },
      { name: "Komanda inkişafı",           weight: 30, evaluator: "Günel Əlizadə", score: 90 },
    ],
  },
];

// Elvin'in tabeliyində olan əməkdaşlar
const SUB_EMPLOYEES: Employee[] = [
  {
    id: "e7", firstName: "Kamran", lastName: "Quliyev", department: "Rəqəmsal Marketinq",
    position: "Şöbə Müdiri", baseSalary: 2900, targetBonusPct: 20,
    subKpis: [
      { name: "Rəqəmsal ROI",               weight: 50, evaluator: "Elvin Rəhimov", score: 95 },
      { name: "Kampaniya sayı",             weight: 30, evaluator: "Elvin Rəhimov", score: 85 },
      { name: "Komanda işi",                weight: 20, evaluator: "Özü", score: 88 },
    ],
  },
  {
    id: "e8", firstName: "Aynur", lastName: "Cəfərova", department: "Brend",
    position: "Şöbə Müdiri", baseSalary: 2900, targetBonusPct: 20,
    subKpis: [
      { name: "Brend awareness",            weight: 40, evaluator: "Elvin Rəhimov", score: 82 },
      { name: "Yeni kampaniyalar",          weight: 30, evaluator: "Elvin Rəhimov", score: 80 },
      { name: "Sosial media reach",         weight: 30, evaluator: "İnteqrasiya (SMM)", score: 85 },
    ],
  },
  {
    id: "e15", firstName: "Orxan", lastName: "Bayramov", department: "Rəqəmsal Marketinq",
    position: "Marketinq Mütəxəssisi", baseSalary: 1900, targetBonusPct: 15,
    subKpis: [
      { name: "Google Ads performans",      weight: 40, evaluator: "Kamran Quliyev", score: 78 },
      { name: "Content marketing",          weight: 30, evaluator: "Kamran Quliyev", score: 82 },
      { name: "Analitika hesabatları",      weight: 30, evaluator: "Özü", score: 88 },
    ],
  },
  {
    id: "e16", firstName: "Aytac", lastName: "Kərimova", department: "Brend",
    position: "Brend Mütəxəssisi", baseSalary: 1900, targetBonusPct: 15,
    subKpis: [
      { name: "Sosial media follower artımı", weight: 40, evaluator: "Aynur Cəfərova", score: 90 },
      { name: "Vizual identitet",             weight: 30, evaluator: "Aynur Cəfərova", score: 85 },
      { name: "Kampaniya materialları",       weight: 30, evaluator: "Özü", score: 87 },
    ],
  },
];

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
              <HubCard icon={User} title="Öz bonuslarım" subtitle="Sizin fərdi performansınıza görə hesablanmış bonuslar." count={OWN_EMPLOYEES.length} gradient="from-indigo-500/15 via-indigo-500/5 to-transparent border-indigo-400/40" onClick={() => setView("own")} />
              <HubCard icon={Network} title="Tabeçiliyimdəkilərin bonusları" subtitle="Tabeliyinizdəki əməkdaşların bonusları." count={SUB_EMPLOYEES.length} gradient="from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-400/40" onClick={() => setView("sub")} />
            </div>
          </>
        )}
        {view === "own" && (
          <>
            <PageHero badge="Rəhbər Paneli" icon={User} title="Öz bonuslarım" subtitle="Sizin fərdi performansınıza görə hesablanmış bonuslar." />
            <BonusPage employeesOverride={OWN_EMPLOYEES} hideChrome hideCalcButton />
          </>
        )}
        {view === "sub" && (
          <>
            <PageHero badge="Rəhbər Paneli" icon={Network} title="Tabeçiliyimdəkilərin bonusları" subtitle="Tabeliyinizdəki əməkdaşların bonusları." />
            <BonusPage employeesOverride={SUB_EMPLOYEES} hideChrome hideCalcButton />
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

export default ManagerBonusPage;

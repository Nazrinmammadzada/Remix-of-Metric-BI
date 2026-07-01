import { useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { GitBranch, Map, Activity, ArrowUpRight } from "lucide-react";
import CascadingPage from "./CascadingPage";
import CascadeTrackingPage from "./CascadeTrackingPage";

type View = null | "map" | "track";

const CascadingHubPage = () => {
  const [view, setView] = useState<View>(null);

  if (view === "map") return <CascadingPage onBack={() => setView(null)} />;
  if (view === "track") return <CascadeTrackingPage onBack={() => setView(null)} />;

  return (
    <div className="min-h-screen">
      <Header title="Cascading" />
      <main className="p-6 pb-24">
        <PageHero
          badge="Cascading"
          icon={GitBranch}
          title="Cascading"
          subtitle="KPI hədəflərinin təşkilati struktur boyu avtomatik yönləndirilməsi və izlənməsi"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          <HubCard
            title="Kaskadlama Xəritəsi"
            desc="Hər struktur vahidinin rəhbərini və tabeliyindəki əməkdaşları interaktiv ağac üzərində izləyin."
            icon={Map}
            gradient="from-indigo-500/15 via-violet-500/10 to-transparent"
            iconBg="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
            onClick={() => setView("map")}
          />
          <HubCard
            title="Kaskad İzləmə"
            desc="Hədəflərin kaskad zənciri boyunca icra statusunu real vaxtda izləyin."
            icon={Activity}
            gradient="from-emerald-500/15 via-teal-500/10 to-transparent"
            iconBg="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            onClick={() => setView("track")}
          />
        </div>
      </main>
    </div>
  );
};

const HubCard = ({
  title, desc, icon: Icon, gradient, iconBg, onClick,
}: { title: string; desc: string; icon: any; gradient: string; iconBg: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${gradient} bg-card p-8 text-left hover:shadow-xl transition-all hover:-translate-y-1 min-h-[240px] flex flex-col`}
  >
    <div className="flex items-start justify-between mb-6">
      <div className={`w-20 h-20 rounded-2xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className="w-10 h-10" />
      </div>
      <ArrowUpRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
    </div>
    <h3 className="font-semibold text-xl text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
  </button>
);

const CascadeTrackingPage = ({ onBack }: { onBack: () => void }) => (
  <div className="min-h-screen">
    <Header title="Cascading" />
    <main className="p-6 pb-24">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-4 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40 text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Geri
      </button>
      <PageHero badge="Cascading" icon={Activity} title="Kaskad İzləmə" subtitle="Kaskad zəncirləri üzrə hədəflərin icra vəziyyəti" />
      <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center">
        <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-1">Tezliklə</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">Bu bölmənin məzmunu tələblər dəqiqləşdikdən sonra əlavə olunacaq.</p>
      </div>
    </main>
  </div>
);

export default CascadingHubPage;

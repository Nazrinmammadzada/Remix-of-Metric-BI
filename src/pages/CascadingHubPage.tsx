import { useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { GitBranch, Network, ArrowUpRight, ChevronLeft, Share2 } from "lucide-react";
import CascadingPage from "./CascadingPage";
import CascadeMatrixPage from "./CascadeMatrixPage";

type CascadeTab = "topology" | "matrix";

const CascadingHubPage = () => {
  const [tab, setTab] = useState<CascadeTab | null>(null);

  if (tab === "topology") {
    return (
      <div className="min-h-screen">
        <div className="p-6 pb-0">
          <button
            onClick={() => setTab(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40 text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
        </div>
        <CascadingPage />
      </div>
    );
  }

  if (tab === "matrix") {
    return (
      <div className="min-h-screen">
        <div className="p-6 pb-0">
          <button
            onClick={() => setTab(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40 text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
        </div>
        <CascadeMatrixPage />
      </div>
    );
  }

  const cards: Array<{
    title: string;
    desc: string;
    icon: typeof Network;
    gradient: string;
    iconBg: string;
    tab: CascadeTab;
  }> = [
    {
      title: "Cascading izlənilməsi",
      desc: "Topology — hər bir hədəf üzrə cascade paylaşımının izlənilməsi və idarə olunması",
      icon: Share2,
      gradient: "from-indigo-500/15 via-violet-500/10 to-transparent",
      iconBg: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
      tab: "topology",
    },
    {
      title: "Cascading matrisləri",
      desc: "Matrisin yaradılması, sazlanması və silinməsi",
      icon: Network,
      gradient: "from-emerald-500/15 via-teal-500/10 to-transparent",
      iconBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
      tab: "matrix",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header title="Cascading" />
      <main className="p-6 pb-24">
        <PageHero
          badge="Cascading"
          icon={GitBranch}
          title="Cascading"
          subtitle="Cascading izlənilməsi və cascade matrislərinin idarə olunması"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {cards.map(c => (
            <button
              key={c.tab}
              onClick={() => setTab(c.tab)}
              className={`group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br ${c.gradient} bg-card p-8 text-left hover:shadow-xl transition-all hover:-translate-y-1 min-h-[260px] flex flex-col`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`w-20 h-20 rounded-2xl ${c.iconBg} flex items-center justify-center shrink-0`}>
                  <c.icon className="w-10 h-10" />
                </div>
                <ArrowUpRight className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <h3 className="font-semibold text-xl text-foreground mb-2">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CascadingHubPage;

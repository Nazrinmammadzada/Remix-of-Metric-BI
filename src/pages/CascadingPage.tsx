import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { GitBranch, ChevronLeft, Star, AlertTriangle, CheckCircle2, User2, Building2 } from "lucide-react";
import {
  resolveAllCascadeChains,
  validateStarStructure,
  type CascadeNode,
  type StarValidationIssue,
} from "@/lib/starCascadeService";

const CascadingPage = ({ onBack }: { onBack?: () => void } = {}) => {
  const [chains, setChains] = useState<CascadeNode[]>(() => resolveAllCascadeChains());
  const [issues, setIssues] = useState<StarValidationIssue[]>(() => validateStarStructure());

  useEffect(() => {
    const refresh = () => {
      setChains(resolveAllCascadeChains());
      setIssues(validateStarStructure());
    };
    window.addEventListener("org-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("org-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const stats = useMemo(() => {
    let total = 0, withStar = 0, multi = 0, missing = 0;
    const walk = (n: CascadeNode) => {
      total++;
      if (n.starHolder) withStar++;
      if (n.multipleStars) multi++;
      if (n.missingStar) missing++;
      n.children.forEach(walk);
    };
    chains.forEach(walk);
    return { total, withStar, multi, missing };
  }, [chains]);

  return (
    <div className="min-h-screen">
      <Header title="Cascading" />
      <main className="p-6 pb-24">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-4 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40 text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
        )}
        <PageHero
          badge="Rəhbər rolu (Star Person)"
          icon={GitBranch}
          title="Kaskadlama Xəritəsi"
          subtitle="KPI hədəfləri təşkilati struktur və Rəhbər rolu (⭐) daşıyan şəxslər əsasında avtomatik və rekursiv şəkildə yönləndirilir. Rəhbər rolu vəzifəyə deyil, birbaşa şəxsə verilir — status daşıyan şəxs dəyişdikdə kaskadlama avtomatik yenilənir."
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Struktur vahidi" value={stats.total} tone="neutral" icon={Building2} />
          <StatCard label="Rəhbər təyin edilib" value={stats.withStar} tone="ok" icon={Star} />
          <StatCard label="Birdən çox rəhbər" value={stats.multi} tone="warn" icon={AlertTriangle} />
          <StatCard label="Rəhbər təyin edilməyib" value={stats.missing} tone="danger" icon={AlertTriangle} />
        </div>

        {/* Issues */}
        {issues.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="font-medium text-foreground">Diqqət tələb edən struktur vahidləri ({issues.length})</h3>
            </div>
            <ul className="space-y-1.5 text-sm">
              {issues.slice(0, 10).map(i => (
                <li key={`${i.unitId}-${i.kind}`} className="flex items-start gap-2">
                  <span className={`mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    i.kind === "multiple" ? "bg-red-500/15 text-red-700 dark:text-red-300" :
                                             "bg-slate-500/15 text-slate-700 dark:text-slate-300"
                  }`}>
                    {i.kind === "multiple" ? "Birdən çox rəhbər" : "Rəhbər yoxdur"}
                  </span>
                  <span className="text-foreground">{i.path}</span>
                  {i.detail && <span className="text-muted-foreground">— {i.detail}</span>}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              Rəhbər rolu təyin etmək üçün <b>Təşkilat → Struktur kataloqu → Ştat cədvəli</b>-nə keçin və əməkdaşın yanındakı ⭐ düyməsinə klik edin. Rəhbər rolu birbaşa şəxsə verilir.
            </p>
          </div>
        )}

        {/* Cascade Trees */}
        {chains.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            Təşkilati struktur boşdur.
          </div>
        ) : (
          <div className="space-y-6">
            {chains.map(root => (
              <div key={root.unitId} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-5 py-3 bg-secondary/30 border-b border-border flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground">{root.unitName}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{root.unitType}</span>
                </div>
                <div className="p-4">
                  <TreeRow node={root} depth={0} />
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground mt-6">
          ⭐ Rəhbər rolu ŞƏXSƏ verilir — vəzifəyə deyil. Sistem strukturdan tabelikləri avtomatik oxuyur; rəhbər rolu daşıyan alt-rəhbərlər öz alt strukturlarına eyni qayda ilə hədəfləri rekursiv bölüşdürə bilər.
        </p>
      </main>
    </div>
  );
};

const StatCard = ({ label, value, tone, icon: Icon }: { label: string; value: number; tone: "neutral" | "ok" | "warn" | "danger"; icon: any }) => {
  const cls =
    tone === "ok"     ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" :
    tone === "warn"   ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" :
    tone === "danger" ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30" :
                        "bg-secondary text-foreground border-border";
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <div className="flex items-center gap-2 text-[11px] opacity-80"><Icon className="w-3.5 h-3.5" /> {label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
};

const TreeRow = ({ node, depth }: { node: CascadeNode; depth: number }) => {
  const holder = node.starHolder;
  const state: "ok" | "multi" | "missing" =
    node.missingStar ? "missing" : node.multipleStars ? "multi" : "ok";
  const stateStyle =
    state === "ok"    ? "border-emerald-500/40 bg-emerald-500/5" :
    state === "multi" ? "border-amber-500/40 bg-amber-500/5" :
                        "border-red-500/40 bg-red-500/5";
  return (
    <div style={{ marginLeft: depth * 24 }} className="relative">
      {depth > 0 && (
        <span className="absolute -left-4 top-4 w-3 h-px bg-border" aria-hidden />
      )}
      <div className={`flex items-center gap-3 rounded-xl border ${stateStyle} px-3 py-2 mb-2`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          state === "ok" ? "bg-amber-400 text-white" : state === "multi" ? "bg-amber-200 text-amber-700" : "bg-red-500/20 text-red-600"
        }`}>
          <Star className={`w-4 h-4 ${state === "ok" ? "fill-white" : ""}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">{node.unitName}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{node.unitType}</span>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            {state === "missing" ? (
              <span className="text-red-600 dark:text-red-400">Rəhbər rolu daşıyan şəxs yoxdur — kaskadlama bloklanır</span>
            ) : state === "multi" ? (
              <span className="text-amber-700 dark:text-amber-300">
                Birdən çox rəhbər: {node.starHolders.map(h => `${h.firstName} ${h.lastName}`).join(", ")}
              </span>
            ) : (
              <>
                <User2 className="w-3 h-3" />
                <span className="text-foreground">{holder!.firstName} {holder!.lastName}</span>
                {holder!.positionName && (
                  <>
                    <span className="opacity-60">·</span>
                    <span>{holder!.positionName}</span>
                  </>
                )}
                <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-1" />
              </>
            )}
          </div>
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="border-l border-border ml-4 pl-3">
          {node.children.map(c => <TreeRow key={c.unitId} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
};

export default CascadingPage;

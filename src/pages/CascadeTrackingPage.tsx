// Kaskad İzləmə — YALNIZ İZLƏMƏ. Bölgü/redaktə burada aparılmır — rəhbər öz
// "Məsul olduğum kartlar" ekranından bölgünü edir.
import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Activity, ChevronLeft, ChevronRight, ChevronDown, Crown, Search, CheckCircle2, Clock, AlertTriangle, Circle } from "lucide-react";
import { useCascadeTree, getChildren, distributedOf, remainingOf, statusOf, type CascadeTreeNode, type CascadeStatus } from "@/lib/cascadeTreeStore";

const fmt = (n: number) => new Intl.NumberFormat("az-AZ").format(Math.round(n * 100) / 100);

const CascadeTrackingPage = ({ onBack }: { onBack: () => void }) => {
  const nodes = useCascadeTree();
  const roots = useMemo(() => nodes.filter(n => n.parentId === null), [nodes]);
  const [activeRoot, setActiveRoot] = useState<string | null>(roots[0]?.id || null);
  const [q, setQ] = useState("");
  

  const filtered = roots.filter(r => !q || r.goalName.toLowerCase().includes(q.toLowerCase()) || r.cardName.toLowerCase().includes(q.toLowerCase()));
  const current = nodes.find(n => n.id === activeRoot);

  return (
    <div className="min-h-screen">
      <Header title="Cascading" />
      <main className="p-6 pb-24">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-4 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40 text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> Geri
        </button>
        <PageHero badge="Cascading" icon={Activity} title="Kaskad İzləmə" subtitle="Cascading aktiv olan hər bir ana hədəfin bölgü zənciri və qalıq limiti" />

        <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4">
          {/* Root list */}
          <aside className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ana hədəf axtar..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Cascadeable ana hədəf yoxdur.</div>
              ) : filtered.map(r => {
                const st = statusOf(r.id);
                const active = r.id === activeRoot;
                return (
                  <button key={r.id} onClick={() => setActiveRoot(r.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-border transition ${active ? "bg-primary/10" : "hover:bg-secondary/40"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{r.goalName}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{r.cardName}</div>
                      </div>
                      <StatusBadge status={st} compact />
                    </div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground">
                      Limit: <b className="text-foreground">{fmt(r.limit)} {r.unit}</b> · Qalıq: <b className={remainingOf(r.id) === 0 ? "text-emerald-600" : "text-amber-600"}>{fmt(remainingOf(r.id))}</b>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Tree */}
          <section className="rounded-2xl border border-border bg-card p-4">
            {!current ? (
              <div className="p-12 text-center text-sm text-muted-foreground">Ana hədəf seçin</div>
            ) : (
              <TreeNode node={current} depth={0} onDistribute={setDistributeNode} defaultOpen />
            )}
          </section>
        </div>
      </main>

      {distributeNode && (
        <CascadeDistributeDialog
          open={!!distributeNode}
          onOpenChange={(o) => !o && setDistributeNode(null)}
          existingNode={distributeNode}
        />
      )}
    </div>
  );
};

const TreeNode = ({ node, depth, onDistribute, defaultOpen }: { node: CascadeTreeNode; depth: number; onDistribute: (n: CascadeTreeNode) => void; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  const kids = getChildren(node.id);
  const st = statusOf(node.id);
  const dist = distributedOf(node.id);
  const rem = remainingOf(node.id);

  return (
    <div className="space-y-2">
      <div className={`rounded-xl border p-3 transition ${st === "problem" ? "border-destructive/50 bg-destructive/5" : st === "done" ? "border-emerald-500/40 bg-emerald-500/5" : st === "in_progress" ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-background"}`}
        style={{ marginLeft: depth * 20 }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            {kids.length > 0 ? (
              <button onClick={() => setOpen(o => !o)} className="w-6 h-6 rounded-md hover:bg-secondary flex items-center justify-center">
                {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : <div className="w-6" />}
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
              {node.assigneeName.split(" ").map(p => p[0]).join("").slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground truncate">
                {node.assigneeName}
                {node.isStar && <Crown className="w-3.5 h-3.5 text-amber-500" />}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{node.positionName || "—"}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <Metric label="Limit" val={`${fmt(node.limit)} ${node.unit}`} />
            <Metric label="Bölüşdürülüb" val={`${fmt(dist)}`} accent={dist > 0 ? "text-primary" : ""} />
            <Metric label="Qalıq" val={`${fmt(rem)}`} accent={rem === 0 ? "text-emerald-600" : "text-amber-600"} />
            <StatusBadge status={st} />
            {node.isStar && kids.length === 0 && (
              <button onClick={() => onDistribute(node)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90">
                <GitBranch className="w-3.5 h-3.5" /> Kaskad et
              </button>
            )}
          </div>
        </div>
      </div>

      {open && kids.map(k => <TreeNode key={k.id} node={k} depth={depth + 1} onDistribute={onDistribute} defaultOpen />)}
    </div>
  );
};

const Metric = ({ label, val, accent }: { label: string; val: string; accent?: string }) => (
  <div className="hidden md:block text-right">
    <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`text-xs font-semibold ${accent || "text-foreground"}`}>{val}</div>
  </div>
);

const StatusBadge = ({ status, compact }: { status: CascadeStatus; compact?: boolean }) => {
  const map = {
    done:        { icon: CheckCircle2, label: "Tamamlandı",  cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    in_progress: { icon: Clock,        label: "Davam edir",  cls: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    problem:     { icon: AlertTriangle,label: "Problem var", cls: "bg-destructive/15 text-destructive border-destructive/30" },
    wait:        { icon: Circle,       label: "Gözləyir",    cls: "bg-muted text-muted-foreground border-border" },
  }[status];
  const Icon = map.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border ${map.cls}`}>
      <Icon className="w-3 h-3" />
      {!compact && map.label}
    </span>
  );
};

export default CascadeTrackingPage;

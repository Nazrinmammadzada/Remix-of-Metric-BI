// Kaskad İzləmə — YALNIZ İZLƏMƏ. Bütün kaskadlanan KPİ kartları kart siyahısı
// şəklində əks olunur, klikləyəndə tam iyerarxiya topologiyası açılır.
import { useMemo, useState, useEffect, useRef } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Activity, ChevronLeft, Search, Crown, X, Maximize2, Users, Target } from "lucide-react";
import { useCascadeTree, getChildren, distributedOf, remainingOf, type CascadeTreeNode } from "@/lib/cascadeTreeStore";

const fmt = (n: number) => new Intl.NumberFormat("az-AZ").format(Math.round(n * 100) / 100);

// Node rəngi: yaşıl (tam bölüşdürülüb), qırmızı (qalıq var), boz (yarpaq — son icraçı)
type NodeTone = "green" | "red" | "neutral";
const toneOf = (n: CascadeTreeNode): NodeTone => {
  const kids = getChildren(n.id);
  if (kids.length === 0) return "neutral";
  const rem = remainingOf(n.id);
  return rem <= 0.0001 ? "green" : "red";
};

const toneClasses: Record<NodeTone, { border: string; bg: string; ring: string; dot: string; label: string }> = {
  green:   { border: "border-emerald-500/60",     bg: "bg-emerald-500/10",     ring: "ring-emerald-500/30",     dot: "bg-emerald-500",  label: "Tam bölüşdürülüb" },
  red:     { border: "border-destructive/60",     bg: "bg-destructive/10",     ring: "ring-destructive/30",     dot: "bg-destructive",  label: "Bölünməmiş (Qırmızı Zona)" },
  neutral: { border: "border-slate-300 dark:border-slate-700", bg: "bg-card",  ring: "ring-slate-400/20",       dot: "bg-slate-400",    label: "Son icraçı" },
};

const CascadeTrackingPage = ({ onBack }: { onBack: () => void }) => {
  const nodes = useCascadeTree();
  const roots = useMemo(() => nodes.filter(n => n.parentId === null), [nodes]);
  const [q, setQ] = useState("");
  const [activeRoot, setActiveRoot] = useState<string | null>(null);
  const [fullView, setFullView] = useState(false);
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);

  // Bütün ağac üzrə axtarış — həm kök kartlar, həm də bütün alt hədəf sahibləri.
  const ql = q.trim().toLowerCase();
  const matchesNode = (n: CascadeTreeNode) =>
    !ql ||
    n.goalName.toLowerCase().includes(ql) ||
    n.cardName.toLowerCase().includes(ql) ||
    n.assigneeName.toLowerCase().includes(ql) ||
    (n.positionName || "").toLowerCase().includes(ql);

  // Axtarış nəticələri: eşleşen hər node — root'u ilə birlikdə göstərilir.
  const matchedNodes = useMemo(() => {
    if (!ql) return [] as CascadeTreeNode[];
    return nodes.filter(matchesNode);
  }, [nodes, ql]);

  // Filtrlənmiş root kartlar: özü ya da altındaki hər hansı node uyğun gəlirsə göstər.
  const matchedRootIds = new Set(matchedNodes.map(n => n.rootId));
  const filtered = ql ? roots.filter(r => matchedRootIds.has(r.id)) : roots;

  const current = nodes.find(n => n.id === activeRoot);

  // Seçilən əməkdaşın kartına avtomatik scroll və highlight
  useEffect(() => {
    if (!highlightNodeId) return;
    const t = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-cascade-node-id="${highlightNodeId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    }, 80);
    const clr = setTimeout(() => setHighlightNodeId(null), 2600);
    return () => { clearTimeout(t); clearTimeout(clr); };
  }, [highlightNodeId, activeRoot, fullView]);

  // Alt-hədəf sahibinə klik olunanda: onun rootu-nu aç və özünə scroll et.
  const focusEmployeeNode = (n: CascadeTreeNode) => {
    setActiveRoot(n.rootId);
    setHighlightNodeId(n.id);
    // Dərinlik böyükdürsə tam ekrana keç ki, bütün alt qollar açılsın.
    let depth = 0;
    let cur: CascadeTreeNode | undefined = n;
    while (cur && cur.parentId) {
      depth += 1;
      cur = nodes.find(x => x.id === cur!.parentId);
    }
    if (depth > 2) setFullView(true);
  };

  return (
    <div className="min-h-screen">
      <Header title="Cascading" />
      <main className="p-6 pb-24">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-4 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40 text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" /> Geri
        </button>
        <PageHero badge="Cascading" icon={Activity} title="Kaskad İzləmə" subtitle="Bütün kaskadlanan KPI kartları — klikləyərək iyerarxiya topologiyasını açın" />

        {/* Axtarış */}
        <div className="mb-4 max-w-md relative">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="KPI kartı, hədəf, təyinedici və ya alt icraçı axtar..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          {ql && matchedNodes.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-72 overflow-y-auto">
              {matchedNodes.slice(0, 12).map(n => {
                const root = nodes.find(x => x.id === n.rootId);
                return (
                  <button key={n.id} onClick={() => { focusEmployeeNode(n); setQ(""); }}
                    className="w-full text-left px-3 py-2 hover:bg-secondary/60 border-b border-border last:border-0">
                    <div className="text-xs font-semibold text-foreground truncate">{n.assigneeName}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {n.positionName || "—"} · {root?.goalName || n.goalName}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>


        {/* Split layout: sol — kartlar (scrollable), sağ — topologiya */}
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
          {/* SOL: Kartlar */}
          <aside className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Kaskadlanan Kartlar</div>
              <span className="text-[11px] text-muted-foreground">{filtered.length} kart</span>
            </div>
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Nəticə yoxdur.</div>
            ) : (
              <div className="overflow-y-auto max-h-[calc(100vh-320px)] p-3 space-y-2">
                {filtered.map(r => {
                  const tone = toneOf(r);
                  const t = toneClasses[tone];
                  const dist = distributedOf(r.id);
                  const rem = remainingOf(r.id);
                  const pct = r.limit > 0 ? Math.min(100, (dist / r.limit) * 100) : 0;
                  const isActive = activeRoot === r.id;
                  return (
                    <button key={r.id} onClick={() => setActiveRoot(r.id)}
                      className={`w-full text-left rounded-xl border-2 p-3 transition-all ${t.border} ${t.bg} ${isActive ? `ring-2 ${t.ring}` : "hover:ring-1 hover:ring-primary/20"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{r.cardName}</div>
                          <div className="text-sm font-semibold text-foreground mt-0.5 truncate">{r.goalName}</div>
                        </div>
                        <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${t.dot}`} />
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-semibold">
                          {r.assigneeName.split(" ").map(p => p[0]).join("").slice(0, 2)}
                        </div>
                        <span className="truncate">{r.assigneeName}</span>
                        {r.isStar && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Limit</span>
                          <span className="font-semibold text-foreground">{fmt(r.limit)} {r.unit}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full ${tone === "green" ? "bg-emerald-500" : tone === "red" ? "bg-destructive" : "bg-slate-400"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Bölünüb: <b className="text-foreground">{fmt(dist)}</b></span>
                          <span className={rem <= 0.0001 ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}>Qalıq: {fmt(rem)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* SAĞ: Topologiya */}
          <section className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col min-h-[520px]">
            {current ? (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <Target className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">Hədəf Topologiyası — {current.goalName}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{current.cardName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Legend />
                    <button onClick={() => setFullView(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border bg-background hover:bg-secondary/60 transition">
                      <Maximize2 className="w-3.5 h-3.5" /> Tam formatda aç
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-6">
                  <Topology root={current} compact highlightId={highlightNodeId} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-12 text-center text-sm text-muted-foreground">
                <div>
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Sol tərəfdən bir kart seçin — onun hədəf topologiyası burada açılacaq.
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Tam ekran topologiya */}
        {fullView && current && (
          <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">Tam Topologiya — {current.goalName}</div>
                <div className="text-[11px] text-muted-foreground truncate">{current.cardName}</div>
              </div>
              <div className="flex items-center gap-3">
                <Legend />
                <button onClick={() => setFullView(false)} className="p-2 rounded-lg hover:bg-secondary transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-8">
              <Topology root={current} compact={false} highlightId={highlightNodeId} />
            </div>
          </div>
        )}
      </main>

    </div>
  );
};

/* ------------------------ Topology (yatay ağac) ------------------------ */

const Legend = () => (
  <div className="hidden md:flex items-center gap-3 text-[10px] text-muted-foreground">
    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Tam</span>
    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Qırmızı zona</span>
    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Son icraçı</span>
  </div>
);

const Topology = ({ root, compact, highlightId }: { root: CascadeTreeNode; compact: boolean; highlightId?: string | null }) => {
  return (
    <div className="cascade-tree inline-block min-w-full">
      <style>{treeCss}</style>
      <ul className="cascade-root">
        <TopoNode node={root} depth={0} maxDepth={99} highlightId={highlightId ?? null} />
      </ul>
    </div>
  );
};

const TopoNode = ({ node, depth, maxDepth, highlightId }: { node: CascadeTreeNode; depth: number; maxDepth: number; highlightId: string | null }) => {
  const kids = getChildren(node.id);
  const tone = toneOf(node);
  const t = toneClasses[tone];
  const dist = distributedOf(node.id);
  const rem = remainingOf(node.id);
  const showKids = kids.length > 0 && depth < maxDepth;
  const hiddenKids = kids.length > 0 && depth >= maxDepth;
  const isHi = highlightId === node.id;

  return (
    <li>
      <div
        data-cascade-node-id={node.id}
        className={`cascade-node inline-block rounded-xl border-2 ${t.border} ${t.bg} px-3 py-2 min-w-[190px] max-w-[230px] text-left shadow-sm transition-all ${isHi ? "ring-4 ring-primary/60 shadow-lg -translate-y-0.5" : ""}`}
      >
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${t.dot}`} />
          <span className="text-[11px] font-semibold text-foreground truncate">{node.assigneeName}</span>
          {(node.isStar || kids.length > 0) && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
        </div>
        {node.positionName && (
          <div className="text-[10px] text-muted-foreground truncate mt-0.5">{node.positionName}</div>
        )}
        <div className="mt-1.5 text-[12px] font-bold text-foreground">
          {fmt(node.limit)} <span className="text-[10px] font-normal text-muted-foreground">{node.unit}</span>
        </div>
        {kids.length > 0 && (
          <div className="mt-1 flex items-center justify-between text-[10px]">
            <span className="text-muted-foreground">Bölünüb: <b className="text-foreground">{fmt(dist)}</b></span>
            <span className={rem <= 0.0001 ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}>
              Qalıq: {fmt(rem)}
            </span>
          </div>
        )}
        {hiddenKids && (
          <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-primary">
            <Users className="w-3 h-3" /> +{kids.length} alt hədəf (tam formatda aç)
          </div>
        )}
      </div>
      {showKids && (
        <ul>
          {kids.map(k => <TopoNode key={k.id} node={k} depth={depth + 1} maxDepth={maxDepth} highlightId={highlightId} />)}
        </ul>
      )}
    </li>
  );
};

// Klassik yatay ağac üçün CSS (pseudo-elementlərlə bağlantı xətləri).
const treeCss = `
.cascade-tree ul { list-style: none; padding: 0; margin: 0; display: flex; justify-content: center; }
.cascade-tree > ul.cascade-root { padding-top: 0; }
.cascade-tree ul ul { padding-top: 28px; position: relative; gap: 12px; }
.cascade-tree li { position: relative; padding: 28px 10px 0; text-align: center; }
.cascade-tree > ul.cascade-root > li { padding-top: 0; }
.cascade-tree > ul.cascade-root > li::before,
.cascade-tree > ul.cascade-root > li::after { display: none; }
.cascade-tree li::before, .cascade-tree li::after {
  content: ''; position: absolute; top: 0; right: 50%;
  border-top: 2px solid hsl(var(--border));
  width: 50%; height: 28px;
}
.cascade-tree li::after { right: auto; left: 50%; border-left: 2px solid hsl(var(--border)); }
.cascade-tree li:only-child::before, .cascade-tree li:only-child::after {
  display: none;
}
.cascade-tree li:only-child { padding-top: 28px; }
.cascade-tree li:first-child::before, .cascade-tree li:last-child::after { border: 0 none; }
.cascade-tree li:last-child::before {
  border-right: 2px solid hsl(var(--border)); border-radius: 0 6px 0 0;
}
.cascade-tree li:first-child::after { border-radius: 6px 0 0 0; }
.cascade-tree li > .cascade-node { position: relative; display: inline-block; }
.cascade-tree ul ul::before {
  content: ''; position: absolute; top: 0; left: 50%;
  border-left: 2px solid hsl(var(--border)); height: 28px;
}
`;

export default CascadeTrackingPage;

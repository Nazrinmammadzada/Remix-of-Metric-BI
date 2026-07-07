import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Target, Bell, Search, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCascadeAssignments, emptyLimits, type CascadeSlice, type CascadeAssignment } from "@/lib/cascadingStore";
import { useCascadeTree } from "@/lib/cascadeTreeStore";

type ExecStatus = "completed" | "in_progress" | "pending" | "overdue";

// Deterministic mock execution status per slice id.
const statusFor = (id: string): { status: ExecStatus; progress: number } => {
  const hash = Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0);
  const progress = 10 + (hash * 7) % 91;
  let status: ExecStatus = "in_progress";
  if (progress >= 95) status = "completed";
  else if (progress < 25) status = "overdue";
  else if (progress < 45) status = "pending";
  return { status, progress };
};

const STATUS_META: Record<ExecStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  completed:   { label: "Tamamlanıb",  cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  in_progress: { label: "İcrada",      cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30", icon: Clock },
  pending:     { label: "Gözləyir",    cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", icon: Clock },
  overdue:     { label: "Gecikib",     cls: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30", icon: AlertTriangle },
};

const GoalTrackingPage = () => {
  const baseAssignments = useCascadeAssignments();
  const cascadeNodes = useCascadeTree();
  const [search, setSearch] = useState("");

  // Cascade Tree-dəki ilkin Root-lar (HR-ın yaratdığı kartlar) və onların bütün
  // alt zənciri Hədəf Təyinatlarının İzlənməsinə əlavə edilir.
  const assignments = useMemo<CascadeAssignment[]>(() => {
    const roots = cascadeNodes.filter(n => !n.parentId);
    const treeAssignments: CascadeAssignment[] = roots.map(r => {
      const kids = cascadeNodes.filter(n => n.rootId === r.rootId && n.parentId);
      return {
        id: `tr-${r.id}`,
        entryId: r.id,
        cardName: r.cardName,
        subKpiName: r.goalName || "Ana hədəf",
        parentTarget: String(r.limit),
        unit: r.unit,
        status: "submitted" as const,
        updatedAt: r.updatedAt,
        slices: kids.map(k => ({
          id: k.id,
          assigneeName: k.assigneeName,
          target: String(k.limit),
          limits: emptyLimits(),
        })),
      };
    });
    return [...baseAssignments, ...treeAssignments];
  }, [baseAssignments, cascadeNodes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter(a =>
      a.cardName.toLowerCase().includes(q) ||
      a.subKpiName.toLowerCase().includes(q) ||
      a.slices.some(s => s.assigneeName.toLowerCase().includes(q))
    );
  }, [assignments, search]);

  const totals = useMemo(() => {
    let total = 0, done = 0, overdue = 0;
    assignments.forEach(a => a.slices.forEach(s => {
      total++;
      const st = statusFor(s.id).status;
      if (st === "completed") done++;
      if (st === "overdue") overdue++;
    }));
    return { total, done, overdue };
  }, [assignments]);

  const notify = (slice: CascadeSlice, cardName: string) => {
    toast.success(`Notification ${slice.assigneeName} şəxsinə göndərildi`, {
      description: `Kart: ${cardName} • Hədəf icrasını yeniləməyi xatırlatdıq`,
    });
  };

  const notifyAll = (cardName: string, slices: CascadeSlice[]) => {
    toast.success(`${slices.length} şəxsə notification göndərildi`, {
      description: `Kart: ${cardName}`,
    });
  };

  return (
    <div className="min-h-screen">
      <Header title="Hədəf təyinlərinin izlənilməsi" />
      <main className="p-6 pb-24">
        <PageHero
          badge="İzləmə"
          icon={Target}
          title="Hədəf təyinlərinin izlənilməsi"
          subtitle="Hər bir kart üzrə təyin olunmuş hədəflərin icra statusunu izləyin və əlaqədar şəxslərə bildiriş göndərin"
          right={
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border text-xs">
                <span className="font-semibold text-foreground">{totals.total}</span>
                <span className="text-muted-foreground">təyinat • </span>
                <span className="font-semibold text-emerald-600">{totals.done}</span>
                <span className="text-muted-foreground">tamam • </span>
                <span className="font-semibold text-red-600">{totals.overdue}</span>
                <span className="text-muted-foreground">gecikən</span>
              </div>
            </div>
          }
        />

        <div className="mb-4 flex items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Kart, hədəf və ya şəxs üzrə axtarış"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-16 text-center text-muted-foreground">
            <Target className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm">İzləniləcək hədəf təyinatı tapılmadı.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(a => {
              const avg = Math.round(a.slices.reduce((s, sl) => s + statusFor(sl.id).progress, 0) / Math.max(1, a.slices.length));
              return (
                <div key={a.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between gap-3 p-4 bg-secondary/40 border-b border-border">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">{a.cardName}</div>
                      <div className="font-semibold text-foreground truncate">{a.subKpiName}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Ümumi hədəf: <span className="font-medium text-foreground">{a.parentTarget} {a.unit}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-[11px] text-muted-foreground">Orta icra</div>
                        <div className="text-lg font-bold text-foreground">{avg}%</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => notifyAll(a.cardName, a.slices)} className="gap-1.5">
                        <Bell className="w-3.5 h-3.5" /> Hamısına bildiriş
                      </Button>
                    </div>
                  </div>

                  <div className="divide-y divide-border">
                    {a.slices.map(s => {
                      const { status, progress } = statusFor(s.id);
                      const meta = STATUS_META[status];
                      const Icon = meta.icon;
                      return (
                        <div key={s.id} className="p-4 flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {s.assigneeName.split(" ").map(p => p[0]).slice(0, 2).join("")}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground text-sm truncate">{s.assigneeName}</span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border ${meta.cls}`}>
                                <Icon className="w-3 h-3" /> {meta.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground">Hədəf: {s.target} {a.unit}</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  status === "completed" ? "bg-emerald-500" :
                                  status === "overdue" ? "bg-red-500" :
                                  status === "pending" ? "bg-amber-500" : "bg-blue-500"
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <Button size="sm" onClick={() => notify(s, a.cardName)} className="gap-1.5 shrink-0">
                            <Bell className="w-3.5 h-3.5" /> Bildiriş
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default GoalTrackingPage;

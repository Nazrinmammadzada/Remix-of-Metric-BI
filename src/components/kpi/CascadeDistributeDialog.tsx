// Kaskadlama bölgü dialoqu — Star rəhbər alt şəxslər arasında limit bölüşdürür.
// Cascading Matrix YOXDUR — tabelikdəki şəxslər `orgStore`-dan avtomatik alınır.
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GitBranch, Crown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getEmployees, getSubordinatesOfStarHolder, findStructureById, getStructures } from "@/lib/orgStore";
import { distribute, getChildren, remainingOf, createRoot, findRootByGoal, type CascadeTreeNode } from "@/lib/cascadeTreeStore";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Mövcud root (varsa) və ya root parametrlərindən yaradılır */
  existingNode?: CascadeTreeNode;
  bootstrap?: {
    cardName: string;
    goalName: string;
    unit: string;
    assigneeName: string;
    assigneeId?: number;
    limit: number;
  };
  onDistributed?: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat("az-AZ").format(Math.round(n * 100) / 100);

const CascadeDistributeDialog = ({ open, onOpenChange, existingNode, bootstrap, onDistributed }: Props) => {
  const [node, setNode] = useState<CascadeTreeNode | undefined>(existingNode);

  useEffect(() => { setNode(existingNode); setSlices({}); }, [existingNode?.id, open]);

  // Lazy-create root when opening from KpiSet entry
  useEffect(() => {
    if (!open || existingNode || !bootstrap) return;
    const emp = bootstrap.assigneeId
      ? getEmployees().find(e => e.id === bootstrap.assigneeId)
      : getEmployees().find(e => `${e.firstName} ${e.lastName}` === bootstrap.assigneeName);
    if (!emp) return;
    const existing = findRootByGoal(bootstrap.cardName, bootstrap.goalName, emp.id);
    setNode(existing || createRoot({
      cardName: bootstrap.cardName, goalName: bootstrap.goalName, unit: bootstrap.unit,
      assigneeId: emp.id, assigneeName: `${emp.firstName} ${emp.lastName}`,
      positionName: emp.positionName, limit: bootstrap.limit,
    }));
  }, [open, existingNode, bootstrap]);

  // Tabelikdəki şəxslər
  const subordinates = useMemo(() => {
    if (!node) return [];
    // struktur vahidini şəxsin structurePath-i əsasında tap
    const emp = getEmployees().find(e => e.id === node.assigneeId);
    if (!emp) return [];
    const findUnitId = (): number | null => {
      const walk = (list: any[], path: string[]): number | null => {
        for (const n of list) {
          const cur = [...path, n.name];
          if (cur.join(" › ") === emp.structurePath) return n.id;
          const inChild = walk(n.children, cur);
          if (inChild) return inChild;
        }
        return null;
      };
      return walk(getStructures(), []);
    };
    const unitId = findUnitId();
    if (!unitId) return [];
    return getSubordinatesOfStarHolder(node.assigneeId, unitId);
  }, [node?.id]);

  const [slices, setSlices] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!node) return;
    // mövcud bölgüləri əvvəlcədən doldur — və ya subordinatları bərabər böl
    const kids = getChildren(node.id);
    const seed: Record<number, string> = {};
    if (kids.length) {
      kids.forEach(k => { seed[k.assigneeId] = String(k.limit); });
    } else if (subordinates.length && node.limit > 0) {
      const per = Math.floor((node.limit / subordinates.length) * 100) / 100;
      subordinates.forEach((e, i) => {
        // Son əməkdaşa qalıq düşsün ki, cəm dəqiq gəlsin
        seed[e.id] = i === subordinates.length - 1
          ? String(Math.round((node.limit - per * (subordinates.length - 1)) * 100) / 100)
          : String(per);
      });
    }
    setSlices(seed);
  }, [node?.id, subordinates.length]);

  const setSlice = (id: number, val: string) => setSlices(prev => ({ ...prev, [id]: val }));

  const equalSplit = () => {
    if (!node || !subordinates.length) return;
    const per = Math.floor((node.limit / subordinates.length) * 100) / 100;
    const next: Record<number, string> = {};
    subordinates.forEach((e, i) => {
      next[e.id] = i === subordinates.length - 1
        ? String(Math.round((node.limit - per * (subordinates.length - 1)) * 100) / 100)
        : String(per);
    });
    setSlices(next);
  };

  const totalDist = Object.values(slices).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const limit = node?.limit || 0;
  const remaining = limit - totalDist;
  const overflow = remaining < -0.001;
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!node) return;
    const rows = Object.entries(slices)
      .map(([id, v]) => {
        const emp = subordinates.find(e => e.id === Number(id));
        return emp && parseFloat(v) > 0 ? {
          assigneeId: emp.id,
          assigneeName: `${emp.firstName} ${emp.lastName}`,
          positionName: emp.positionName,
          limit: parseFloat(v),
        } : null;
      })
      .filter(Boolean) as any[];
    const res = distribute(node.id, rows);
    if (!res.ok) { setError(res.error || "Xəta"); return; }
    setError(null);
    onDistributed?.();
    onOpenChange(false);
  };

  const statusColor = overflow ? "text-destructive" : remaining === 0 ? "text-emerald-600" : "text-amber-600";
  const StatusIcon = overflow ? AlertTriangle : remaining === 0 ? CheckCircle2 : GitBranch;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Kaskadlama — {node?.goalName || bootstrap?.goalName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {node?.cardName || bootstrap?.cardName} · Ümumi limit: <b>{fmt(limit)} {node?.unit || bootstrap?.unit}</b>
          </p>
        </DialogHeader>

        {/* Choice */}
        <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Bu hədəfi necə təyin etmək istəyirsiniz?</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {([
              { k: "cascade", t: "Mövcud hədəfdən bölərək (Kaskadlama)", d: "Ana hədəfin davamı — parent-child əlaqəsi yaradılır, limit çıxılır." },
              { k: "independent", t: "Yeni müstəqil hədəf", d: "Ana hədəflə əlaqəsi yoxdur; limitdən heç nə çıxılmır." },
            ] as { k: Choice; t: string; d: string }[]).map(opt => (
              <label key={opt.k} className={`cursor-pointer rounded-md border p-2.5 text-xs transition ${choice === opt.k ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <div className="flex items-start gap-2">
                  <input type="radio" checked={choice === opt.k} onChange={() => setChoice(opt.k)} className="mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground">{opt.t}</div>
                    <div className="text-muted-foreground mt-0.5">{opt.d}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {choice === "independent" ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Yeni müstəqil hədəf yaratmaq üçün <b>KPI-lar → Yeni KPI</b> ekranına keçin. Bu hədəf mövcud ana hədəfə təsir etməyəcək.
          </div>
        ) : (
          <>
            {/* Live totals — şəkildəki layout: Ümumi Limit / Paylanmış / Qalıq */}
            <div className="grid grid-cols-3 gap-3">
              <BigStat label="Ümumi Limit (Sizin üzərinizdə)" value={fmt(limit)} unit={node?.unit || ""} tone="neutral" />
              <BigStat label="Paylanmış" value={fmt(totalDist)} unit={node?.unit || ""} tone="primary" />
              <BigStat label="Qalıq" value={fmt(Math.abs(remaining))} unit={node?.unit || ""} tone={overflow ? "danger" : remaining === 0 ? "success" : "warning"} negative={overflow} />
            </div>

            {/* Subordinates list — şəkildəki cədvəl */}
            <div className="rounded-lg border border-border max-h-[320px] overflow-auto">
              {subordinates.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Bu strukturda tabelikdə əməkdaş yoxdur.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-xs text-muted-foreground sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium w-10">#</th>
                      <th className="text-left px-3 py-2 font-medium">Əməkdaş</th>
                      <th className="text-left px-3 py-2 font-medium">Vəzifə</th>
                      <th className="text-right px-3 py-2 font-medium w-44">Kaskad limit ({node?.unit})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subordinates.map((e, idx) => (
                      <tr key={e.id} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground">{e.firstName} {e.lastName}</span>
                            {e.isStarPerson && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{e.positionName || "—"}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number" min={0} inputMode="decimal"
                            value={slices[e.id] || ""}
                            onChange={ev => setSlice(e.id, ev.target.value)}
                            placeholder="0"
                            className="w-36 text-right px-2 py-1 border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {error && <div className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {error}</div>}
            {overflow && <div className="text-xs text-destructive font-medium">⚠ Cəm ana hədəfi keçir — sistem hədəfin şişməsinə icazə vermir.</div>}
          </>

        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Bağla</Button>
          {choice === "cascade" && (
            <Button onClick={handleSave} disabled={overflow || subordinates.length === 0}>
              Bölgünü yadda saxla
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const StatCard = ({ label, value, unit, accent, icon, negative }: { label: string; value: string; unit: string; accent?: string; icon?: React.ReactNode; negative?: boolean }) => (
  <div className="rounded-lg border border-border bg-card p-3">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`mt-1 text-lg font-semibold flex items-center gap-1 ${accent || "text-foreground"}`}>
      {icon}
      {negative ? "−" : ""}{value}
      <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
    </div>
  </div>
);

const BigStat = ({ label, value, unit, tone, negative }: { label: string; value: string; unit: string; tone: "neutral" | "primary" | "success" | "warning" | "danger"; negative?: boolean }) => {
  const toneCls = {
    neutral: "border-border bg-card text-foreground",
    primary: "border-primary/30 bg-primary/5 text-primary",
    success: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    warning: "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
    danger:  "border-destructive/40 bg-destructive/5 text-destructive",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${toneCls}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">
        {negative ? "−" : ""}{value}
        <span className="ml-1.5 text-sm font-normal text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
};


export default CascadeDistributeDialog;

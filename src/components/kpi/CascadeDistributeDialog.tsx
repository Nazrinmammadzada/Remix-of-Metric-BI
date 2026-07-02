// Kaskadlama bölgü dialoqu — Star rəhbər alt şəxslər arasında hədəf dəyərini paylayır.
// DİQQƏT: Rəhbərin hədəf üçün yazdığı ümumi dəyər HƏR BİR əməkdaşa EYNİLƏ təyin olunur.
// Bu, Cascade Load bucket-indən TAM AYRIDIR (o, başqa kartdan gələn və bölünən limitdir).
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
    // Hər bir tabelikdəki əməkdaşa hədəfin dəyəri EYNİLƏ təyin olunur — bölünmür.
    const seed: Record<number, string> = {};
    subordinates.forEach(e => { seed[e.id] = String(node.limit); });
    setSlices(seed);
  }, [node?.id, subordinates.length, node?.limit]);

  const setSlice = (id: number, val: string) => setSlices(prev => ({ ...prev, [id]: val }));


  // Cascade Load bucket — 500 000 AZN shared across all cards
  useCascadeLoad(); // subscribe for live updates
  const bucketKey = useMemo(() => {
    if (node) return `node:${node.id}`;
    if (bootstrap) return `bs:${bootstrap.cardName}::${bootstrap.goalName}::${bootstrap.assigneeId ?? bootstrap.assigneeName}`;
    return "unknown";
  }, [node?.id, bootstrap?.cardName, bootstrap?.goalName, bootstrap?.assigneeId, bootstrap?.assigneeName]);
  const bucketAvailable = availableFor(bucketKey); // remaining + this-key's own allocation
  const alreadyAllocated = getAllocated(bucketKey);

  const totalDist = Object.values(slices).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const limit = bucketAvailable; // artıq hədəf dəyəri yox, cascade load bucket-i
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
    // Load bucket-in ana limitini bölgüyə uyğun yenilə ki, distribute check keçsin.
    if (totalDist > node.limit) {
      // parent.limit-i böyütmək üçün createRoot etməyə ehtiyac yoxdur — birbaşa storage-də dəyişək
      try {
        const raw = localStorage.getItem("cascade_tree_nodes_v1");
        if (raw) {
          const all = JSON.parse(raw) as any[];
          const idx = all.findIndex(n => n.id === node.id);
          if (idx >= 0) { all[idx].limit = totalDist; localStorage.setItem("cascade_tree_nodes_v1", JSON.stringify(all)); }
        }
      } catch {}
    }
    const res = distribute(node.id, rows);
    if (!res.ok) { setError(res.error || "Xəta"); return; }
    setAllocated(bucketKey, totalDist);
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
            {node?.cardName || bootstrap?.cardName} · Hədəf dəyəri (hər əməkdaşa): <b>{fmt(node?.limit || 0)} {node?.unit || bootstrap?.unit}</b>
          </p>
        </DialogHeader>

        {/* Live totals — Hədəf dəyəri hər əməkdaşa eyni təyin olunur */}
        <div className="grid grid-cols-3 gap-3">
          <BigStat label="Hədəf dəyəri (hər əməkdaş)" value={fmt(node?.limit || 0)} unit={node?.unit || "AZN"} tone="neutral" />
          <BigStat label="Əməkdaş sayı" value={String(subordinates.length)} unit="nəfər" tone="primary" />
          <BigStat label="Ümumi paylanan" value={fmt(totalDist)} unit={node?.unit || ""} tone="success" />
        </div>

        <div className="text-[11px] text-muted-foreground">
          Rəhbərin təyin etdiyi hədəf dəyəri hər bir tabelikdəki əməkdaşa eynilə təyin olunur — bölünmür.
        </div>

        {/* Subordinates */}
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
                  <th className="text-right px-3 py-2 font-medium w-44">Təyin olunan dəyər ({node?.unit})</th>
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
                      <div className="inline-flex items-center justify-end w-36 px-2 py-1 border border-border rounded bg-secondary/30 tabular-nums font-medium">
                        {fmt(parseFloat(slices[e.id] || "0"))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {error && <div className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {error}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Bağla</Button>
          <Button onClick={handleSave} disabled={subordinates.length === 0}>
            Təyin et
          </Button>
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

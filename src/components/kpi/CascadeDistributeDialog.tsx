// Kaskadlama bölgü dialoqu — Rəhbər hədəfi 2 fərqli qrup arasında bölüşdürür:
//   1) Bütün tabelikdəki əməkdaşlar
//   2) Tabelikdəki struktur rəhbərləri (star persons)
// Alt bölgülərin cəmi rəhbərin cascade load-undan gəldiyi üçün ana hədəf dəyərini
// aşa bilər — bu tamamilə qanunidir və heç bir səhv çıxarmır.
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GitBranch, Crown, AlertTriangle, Users, ShieldCheck } from "lucide-react";
import { getEmployees, getSubordinatesOfStarHolder, getStructures } from "@/lib/orgStore";
import { distribute, createRoot, findRootByGoal, type CascadeTreeNode } from "@/lib/cascadeTreeStore";


interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
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
  const [tab, setTab] = useState<"all" | "leaders">("all");

  useEffect(() => { setNode(existingNode); setSlices({}); setReCascade({}); setTab("all"); }, [existingNode?.id, open]);

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

  // Tabelikdəki bütün şəxslər
  const subordinates = useMemo(() => {
    if (!node) return [];
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

  const leaders = useMemo(() => subordinates.filter(e => e.isStarPerson), [subordinates]);
  const currentList = tab === "all" ? subordinates : leaders;

  const [slices, setSlices] = useState<Record<number, string>>({});
  const [reCascade, setReCascade] = useState<Record<number, boolean>>({});

  // Hədəf dəyəri avtomatik olaraq hər əməkdaşın "təyin olunan dəyər" xanasına düşsün.
  useEffect(() => {
    if (!node || subordinates.length === 0) return;
    setSlices(prev => {
      const next = { ...prev };
      let changed = false;
      const def = String(node.limit ?? "");
      subordinates.forEach(e => {
        if (next[e.id] === undefined) { next[e.id] = def; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [node?.id, node?.limit, subordinates]);

  const setSlice = (id: number, val: string) => {
    // yalnız rəqəm və nöqtə
    const clean = val.replace(/[^\d.]/g, "");
    setSlices(prev => ({ ...prev, [id]: clean }));
  };
  const toggleReCascade = (id: number) => setReCascade(prev => ({ ...prev, [id]: !prev[id] }));

  const totalDist = Object.values(slices).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const selectedCount = Object.values(slices).filter(v => parseFloat(v) > 0).length;
  const [error, setError] = useState<string | null>(null);
  const parentLimit = node?.limit || 0;
  const overLimit = totalDist > parentLimit;
  const remainingParent = Math.max(0, parentLimit - totalDist);

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
          canReCascade: !!reCascade[emp.id],
        } : null;
      })
      .filter(Boolean) as any[];
    const res = distribute(node.id, rows);
    if (!res.ok) { setError(res.error || "Xəta"); return; }
    setError(null);
    onDistributed?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            Kaskadlama — {node?.goalName || bootstrap?.goalName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {node?.cardName || bootstrap?.cardName} · Ana hədəf dəyəri: <b>{fmt(node?.limit || 0)} {node?.unit || bootstrap?.unit}</b>
          </p>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <BigStat label="Ana hədəf" value={fmt(parentLimit)} unit={node?.unit || "AZN"} tone="neutral" />
          <BigStat label="Paylanan cəm" value={fmt(totalDist)} unit={`(${selectedCount} şəxs)`} tone={overLimit ? "danger" : "success"} />
          <BigStat label="Qalan" value={fmt(remainingParent)} unit={node?.unit || "AZN"} tone="primary" />
        </div>

        <div className="text-[11px] text-muted-foreground">
          Bölüşdürülən cəm ana hədəf limitini <b>keçə bilməz</b>. "Yenidən kaskadlaya bilər" seçili şəxs aldığı hədəfi öz tabeliyindəki əməkdaşlar arasında sonrakı səviyyəyə ötürə bilər.
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" className="gap-2">
              <Users className="w-4 h-4" /> Bütün tabelik ({subordinates.length})
            </TabsTrigger>
            <TabsTrigger value="leaders" className="gap-2">
              <ShieldCheck className="w-4 h-4" /> Struktur rəhbərləri ({leaders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-3">
            <SubTable list={currentList} unit={node?.unit || ""} slices={slices} setSlice={setSlice} reCascade={reCascade} toggleReCascade={toggleReCascade} />
          </TabsContent>
          <TabsContent value="leaders" className="mt-3">
            <SubTable list={currentList} unit={node?.unit || ""} slices={slices} setSlice={setSlice} reCascade={reCascade} toggleReCascade={toggleReCascade} />
          </TabsContent>
        </Tabs>

        {error && <div className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {error}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Bağla</Button>
          <Button onClick={handleSave} disabled={selectedCount === 0 || overLimit}>
            Bölüşdür və təyin et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SubTable = ({
  list, unit, slices, setSlice, reCascade, toggleReCascade,
}: {
  list: any[]; unit: string;
  slices: Record<number, string>; setSlice: (id: number, v: string) => void;
  reCascade: Record<number, boolean>; toggleReCascade: (id: number) => void;
}) => (
  <div className="rounded-lg border border-border max-h-[320px] overflow-auto">
    {list.length === 0 ? (
      <div className="p-6 text-center text-sm text-muted-foreground">Bu qrupda şəxs yoxdur.</div>
    ) : (
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-xs text-muted-foreground sticky top-0">
          <tr>
            <th className="text-left px-3 py-2 font-medium w-10">#</th>
            <th className="text-left px-3 py-2 font-medium">Əməkdaş</th>
            <th className="text-left px-3 py-2 font-medium">Vəzifə</th>
            <th className="text-right px-3 py-2 font-medium w-44">Təyin olunan dəyər ({unit})</th>
            <th className="text-center px-3 py-2 font-medium w-40">Yenidən kaskadlaya bilər</th>
          </tr>
        </thead>
        <tbody>
          {list.map((e, idx) => (
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
                  inputMode="decimal"
                  value={slices[e.id] ?? ""}
                  onChange={(ev) => setSlice(e.id, ev.target.value)}
                  placeholder="0"
                  className="w-36 text-right px-2 py-1 border border-border rounded bg-background tabular-nums font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </td>
              <td className="px-3 py-2 text-center">
                <label className="inline-flex items-center justify-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!reCascade[e.id]}
                    onChange={() => toggleReCascade(e.id)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-1 focus:ring-ring"
                  />
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const BigStat = ({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: "neutral" | "primary" | "success" | "danger" }) => {
  const toneCls = {
    neutral: "border-border bg-card text-foreground",
    primary: "border-primary/30 bg-primary/5 text-primary",
    success: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    danger: "border-destructive/40 bg-destructive/5 text-destructive",
  }[tone];
  return (
    <div className={`rounded-xl border p-4 ${toneCls}`}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">
        {value}
        <span className="ml-1.5 text-sm font-normal text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
};

export default CascadeDistributeDialog;

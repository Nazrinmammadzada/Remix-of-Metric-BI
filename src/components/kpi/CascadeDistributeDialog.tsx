// Kaskadlama bölgü dialoqu — Rəhbər hədəfi 2 fərqli qrup arasında bölüşdürür:
//   1) Bütün tabelikdəki əməkdaşlar
//   2) Tabelikdəki struktur rəhbərləri (star persons)
// Alt bölgülərin cəmi rəhbərin cascade load-undan gəldiyi üçün ana hədəf dəyərini
// aşa bilər — bu tamamilə qanunidir və heç bir səhv çıxarmır.
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GitBranch, Crown, AlertTriangle, Users, ShieldCheck } from "lucide-react";
import { getEmployees, getSubordinatesOfStarHolder, getStructures } from "@/lib/orgStore";
import { distribute, createRoot, findRootByGoal, getNodes, type CascadeTreeNode } from "@/lib/cascadeTreeStore";

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
    defaultSliceValue?: number;
    /** Bu bölgüdən yaranan child node-lar növbəti səviyyəyə load verə bilərmi? */
    cascadable?: boolean;
    /** Cascade Load popup-un tapdığı MƏHZ node ID-si.
     *  Verildikdə dialoq heç bir başqa node axtarmır və yeni root yaratmır —
     *  paylanma məhz bu node-un altında baş verir. */
    nodeId?: string;
  };
  onDistributed?: () => void;
}

type AudienceMode = "all" | "leaders";

const fmt = (n: number) => new Intl.NumberFormat("az-AZ").format(Math.round(n * 100) / 100);

const CascadeDistributeDialog = ({ open, onOpenChange, existingNode, bootstrap, onDistributed }: Props) => {
  const [node, setNode] = useState<CascadeTreeNode | undefined>(existingNode);
  const [audience, setAudience] = useState<AudienceMode | null>(null);
  const [slices, setSlices] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNode(existingNode);
    setSlices({});
    setAudience(null);
    setError(null);
  }, [existingNode?.id, open]);

  // Bootstrap: MÜTLƏQ Cascade Load popup-un tapdığı eyni node üzərində işləyirik.
  // Əgər `nodeId` verilibsə, məhz o node götürülür — heç bir axtarış/yeni root yaradılmır.
  // Yalnız nodeId ümumiyyətlə mövcud olmadıqda (edge case) köhnə fallback işə düşür.
  useEffect(() => {
    if (!open || existingNode || !bootstrap) return;
    // 1) Popup-dan gələn konkret nodeId — sabit istifadə et.
    if (bootstrap.nodeId) {
      const fixed = getNodes().find(n => n.id === bootstrap.nodeId);
      if (fixed) { setNode(fixed); return; }
    }
    const emp = bootstrap.assigneeId
      ? getEmployees().find(e => e.id === bootstrap.assigneeId)
      : getEmployees().find(e => `${e.firstName} ${e.lastName}` === bootstrap.assigneeName);
    if (!emp) return;
    // 2) Fallback: mövcud CHILD node → ROOT → findRootByGoal → yeni root.
    const nodes = getNodes().filter(n => n.assigneeId === emp.id && (Number(n.limit) || 0) > 0);
    const exact = nodes.filter(n => n.cardName === bootstrap.cardName && n.goalName === bootstrap.goalName);
    const pool = exact.length > 0 ? exact : nodes;
    const childNode = pool.find(n => n.parentId !== null);
    const rootNode = pool.find(n => n.parentId === null);
    if (childNode) { setNode(childNode); return; }
    if (rootNode) { setNode(rootNode); return; }
    const existingRoot = findRootByGoal(bootstrap.cardName, bootstrap.goalName, emp.id);
    if (existingRoot) { setNode(existingRoot); return; }
    if (bootstrap.cascadable === false) return;
    setNode(createRoot({
      cardName: bootstrap.cardName, goalName: bootstrap.goalName, unit: bootstrap.unit,
      assigneeId: emp.id, assigneeName: `${emp.firstName} ${emp.lastName}`,
      positionName: emp.positionName, limit: bootstrap.limit,
    }));
  }, [open, existingNode, bootstrap]);


  // Tabelikdəki bütün şəxslər (setter-in structurePath-ı üzrə)
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
  const currentList = audience === "all" ? subordinates : audience === "leaders" ? leaders : [];

  const setSlice = (id: number, val: string) => {
    const clean = val.replace(/[^\d.]/g, "");
    setSlices(prev => ({ ...prev, [id]: clean }));
  };

  const totalDist = Object.values(slices).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const selectedCount = Object.values(slices).filter(v => parseFloat(v) > 0).length;
  const cascadeLoad = Number(node?.limit) || 0;
  // Alt bölgülərin cəmi Cascade Load-dan böyük ola bilər (icazəlidir).
  const overLimit = false;

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
          cascadable: bootstrap?.cascadable ?? true,
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
            {node?.cardName || bootstrap?.cardName} · Cascade Load: <b>{fmt(cascadeLoad)} {node?.unit || bootstrap?.unit}</b>
          </p>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          <BigStat label="Cascade Load" value={fmt(cascadeLoad)} unit={node?.unit || "AZN"} tone="neutral" />
          <BigStat label="Qalıq (paylanmamış)" value={fmt(Math.max(0, cascadeLoad - totalDist))} unit={node?.unit || "AZN"} tone="primary" />
          <BigStat label="Paylanan cəm" value={fmt(totalDist)} unit={`(${selectedCount} şəxs)`} tone={overLimit ? "danger" : "success"} />
        </div>

        {/* ---------- Cascade Təyinat Növü (məcburi seçim) ---------- */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4">
          <div className="text-sm font-medium text-foreground mb-2">Cascade Təyinat Növü</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <AudienceRadio
              active={audience === "all"}
              icon={Users}
              title="Tabeliyimdə olan bütün əməkdaşlar"
              subtitle={`${subordinates.length} şəxs`}
              onClick={() => { setAudience("all"); setSlices({}); }}
            />
            <AudienceRadio
              active={audience === "leaders"}
              icon={ShieldCheck}
              title="Struktur rəhbərləri"
              subtitle={`${leaders.length} rəhbər`}
              onClick={() => { setAudience("leaders"); setSlices({}); }}
            />
          </div>
        </div>

        {audience !== null && (
          <SubTable
            list={currentList}
            unit={node?.unit || ""}
            slices={slices}
            setSlice={setSlice}
            // Default = rəhbərin təyin etdiyi hədəf dəyəri (redaktə oluna bilər).
            // Bu, kaskadlanan dəyər DEYİL — sadəcə rahatlıq üçün ilkin təklifdir.
            defaultValue={bootstrap?.defaultSliceValue != null ? bootstrap.defaultSliceValue : (cascadeLoad > 0 ? cascadeLoad : 0)}
          />
        )}

        {error && <div className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {error}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Bağla</Button>
          <Button onClick={handleSave} disabled={selectedCount === 0 || audience === null || overLimit}>
            Bölüşdür və təyin et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AudienceRadio = ({
  active, icon: Icon, title, subtitle, onClick,
}: {
  active: boolean; icon: any; title: string; subtitle: string; onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left rounded-lg border p-3 flex items-start gap-3 transition-all ${
      active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-background hover:border-primary/40"
    }`}
  >
    <div className={`w-9 h-9 rounded-md flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/70"}`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0">
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </div>
  </button>
);


const SubTable = ({
  list, unit, slices, setSlice, defaultValue,
}: {
  list: any[]; unit: string; slices: Record<number, string>; setSlice: (id: number, v: string) => void;
  defaultValue?: number;
}) => {
  useEffect(() => {
    if (!defaultValue || defaultValue <= 0) return;
    list.forEach(e => {
      if (slices[e.id] === undefined || slices[e.id] === "") {
        setSlice(e.id, String(defaultValue));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.map(e => e.id).join(","), defaultValue]);
  return (
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
            </tr>
          ))}
        </tbody>
      </table>
      )}
  </div>
  );
};

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

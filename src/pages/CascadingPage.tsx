import { useMemo, useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { GitBranch, Share2, Save, AlertCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import SearchableSelect from "@/components/common/SearchableSelect";
import { toast } from "sonner";
import {
  useKpiSet,
  TIER_LABELS,
  type KpiSetEntry,
  type LimitTier,
} from "@/lib/kpiSetStore";
import {
  useCascadeMatrices,
} from "@/lib/cascadeMatrixStore";
import {
  getAssignmentByEntry,
  upsertAssignment,
  buildSliceFor,
  emptyLimits,
  useCascadeAssignments,
  type CascadeSlice,
} from "@/lib/cascadingStore";

const CascadingPage = ({ onBack }: { onBack?: () => void } = {}) => {
  const allEntries = useKpiSet();
  const matrices = useCascadeMatrices();
  const assignments = useCascadeAssignments();
  const cascadable = useMemo(
    () => allEntries.filter(e => e.cascadable && e.status === "completed"),
    [allEntries],
  );
  const [editing, setEditing] = useState<KpiSetEntry | null>(null);

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
          badge="Cascading"
          icon={GitBranch}
          title="Cascading"
          subtitle="Paylaşıla bilən hədəflərin cascade matrisinə əsasən komandaya bölüşdürülməsi"
        />

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">KPI Kartı</th>
                <th className="px-4 py-3 font-medium">Hədəf</th>
                <th className="px-4 py-3 font-medium">Rəhbər</th>
                <th className="px-4 py-3 font-medium">Hədəf</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium w-40 text-right">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {cascadable.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  Paylaşıla bilən hədəf yoxdur. KPI Set modulunda rəhbər hədəf təyin edərkən "Paylaşıla bilər" seçməlidir.
                </td></tr>
              ) : cascadable.map(e => {
                const assign = assignments.find(a => a.entryId === e.id);
                return (
                  <tr key={e.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">{e.cardName}</td>
                    <td className="px-4 py-2.5">{e.subKpiName}</td>
                    <td className="px-4 py-2.5">{e.assigneeName}</td>
                    <td className="px-4 py-2.5">{e.target} {e.unit}</td>
                    <td className="px-4 py-2.5">
                      {assign ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          {assign.slices.length} işçi
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          Paylanmayıb
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" onClick={() => setEditing(e)}>
                        Paylaş
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {editing && (
        <DistributeDialog
          entry={editing}
          matrices={matrices}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

const DistributeDialog = ({
  entry, matrices, onClose,
}: {
  entry: KpiSetEntry;
  matrices: ReturnType<typeof useCascadeMatrices>;
  onClose: () => void;
}) => {
  const existing = getAssignmentByEntry(entry.id);
  const [matrixId, setMatrixId] = useState<string>(existing?.matrixId ?? matrices[0]?.id ?? "");
  const [slices, setSlices] = useState<CascadeSlice[]>(existing?.slices ?? []);

  const matrix = matrices.find(m => m.id === matrixId);

  // Matris dəyişdikdə paylaşılan şəxslərə görə slice-ları sinxronlaşdır
  useEffect(() => {
    if (!matrix) return;
    setSlices(prev => {
      const map = new Map(prev.map(s => [s.assigneeName, s]));
      return matrix.sharedPersons.map(name => map.get(name) ?? buildSliceFor(name));
    });
  }, [matrixId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalDistributed = slices.reduce((s, sl) => s + (parseFloat(sl.target) || 0), 0);
  const parentTarget = parseFloat(entry.target) || 0;
  const exceeded = totalDistributed > parentTarget;

  const updateSlice = (id: string, patch: Partial<CascadeSlice>) =>
    setSlices(s => s.map(x => (x.id === id ? { ...x, ...patch } : x)));

  const updateLimit = (sliceId: string, tier: LimitTier, field: "min" | "max", v: number) =>
    setSlices(s => s.map(x => {
      if (x.id !== sliceId) return x;
      return { ...x, limits: { ...x.limits, [tier]: { ...x.limits[tier], [field]: isNaN(v) ? 0 : v } } };
    }));

  const submit = () => {
    if (!matrixId) { toast.error("Matris seçin"); return; }
    if (slices.length === 0) { toast.error("Matris üçün paylaşılan şəxslər yoxdur"); return; }
    if (slices.some(s => !s.target.trim())) {
      toast.error("Bütün işçilər üçün hədəf payı tələb olunur"); return;
    }
    if (exceeded) {
      toast.error(`Paylanmış hədəf (${totalDistributed}) ümumi hədəfi (${parentTarget}) keçir`);
      return;
    }
    upsertAssignment({
      entryId: entry.id,
      cardName: entry.cardName,
      subKpiName: entry.subKpiName,
      parentTarget: entry.target,
      unit: entry.unit,
      matrixId,
      matrixName: matrix?.name,
      slices,
      status: "submitted",
    });
    toast.success("Paylanma yadda saxlanıldı");
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" />
            Hədəfi paylaş — {entry.subKpiName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Ümumi hədəf: <span className="font-semibold text-foreground">{entry.target} {entry.unit}</span> •
            Paylanmış: <span className={`font-semibold ${exceeded ? "text-destructive" : totalDistributed === parentTarget ? "text-emerald-600" : "text-amber-600"}`}>{totalDistributed} {entry.unit}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Parent limits (read-only) */}
          {entry.limits && (
            <div className="border border-border rounded-lg p-3 bg-secondary/20">
              <div className="text-xs font-medium text-foreground mb-2">Qiymət limitləri (rəhbər tərəfindən təyin olunub, paylanmış işçilərə də istinad):</div>
              <div className="grid grid-cols-5 gap-2 text-[11px]">
                {TIER_LABELS.map(({ tier, label }) => {
                  const r = entry.limits![tier as LimitTier];
                  return (
                    <div key={tier} className="bg-card border border-border rounded p-2 text-center">
                      <div className="text-muted-foreground">{label}</div>
                      <div className="font-medium text-foreground">{r.min} – {r.max}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground">Cascade matrisi</label>
            <SearchableSelect
              value={matrixId}
              onChange={setMatrixId}
              options={matrices.map(m => ({ value: m.id, label: `${m.name} (${m.scopeName})` }))}
              placeholder="Matris seçin"
            />
            {matrix && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Bu matrisdə {matrix.sharedPersons.length} paylaşılan şəxs var. İşçi siyahısı matrisdən gəlir və bu pəncərədə dəyişdirilə bilməz.
              </p>
            )}
          </div>

          {exceeded && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">Paylanmış hədəflərin cəmi ümumi hədəfi keçir. Yadda saxlamaq mümkün deyil.</p>
            </div>
          )}

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 bg-secondary/40">
              <div className="text-sm font-medium">İşçilər və hədəf payı</div>
              <div className="text-[11px] text-muted-foreground">Limit dəyərlərini manual olaraq daxil edin</div>
            </div>
            <div className="divide-y divide-border">
              {slices.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Matris seçilməyib və ya boşdur</div>
              ) : slices.map(s => (
                <div key={s.id} className="p-3 space-y-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-7">
                      <label className="text-[11px] text-muted-foreground">İşçi</label>
                      <div className="px-2 py-1.5 text-sm rounded-md bg-secondary/40 border border-border text-foreground">{s.assigneeName}</div>
                    </div>
                    <div className="col-span-5">
                      <label className="text-[11px] text-muted-foreground">Hədəf ({entry.unit})</label>
                      <Input type="number" value={s.target} onChange={e => updateSlice(s.id, { target: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1">Qiymət limitləri (5→1, manual daxil edilir)</div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {TIER_LABELS.map(({ tier, label }) => {
                        const r = s.limits[tier as LimitTier];
                        return (
                          <div key={tier} className="border border-border rounded p-1.5 bg-background">
                            <div className="text-[10px] text-muted-foreground text-center">{label}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <input
                                type="number"
                                value={r.min}
                                onChange={e => updateLimit(s.id, tier as LimitTier, "min", Number(e.target.value))}
                                className="w-full px-1 py-0.5 text-[11px] border border-border rounded bg-background"
                                placeholder="min"
                              />
                              <span className="text-[10px] text-muted-foreground">–</span>
                              <input
                                type="number"
                                value={r.max}
                                onChange={e => updateLimit(s.id, tier as LimitTier, "max", Number(e.target.value))}
                                className="w-full px-1 py-0.5 text-[11px] border border-border rounded bg-background"
                                placeholder="max"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Ləğv et</Button>
            <Button onClick={submit} disabled={exceeded}><Save className="w-4 h-4 mr-1" /> Yadda saxla</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CascadingPage;

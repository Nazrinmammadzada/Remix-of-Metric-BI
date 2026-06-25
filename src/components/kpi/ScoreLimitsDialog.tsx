import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sliders, Info, Share2, Users, Wand2, AlertTriangle } from "lucide-react";
import {
  type LimitSet,
  type LimitTier,
  type DynamicTier,
  TIER_LABELS,
  suggestLimitsFromTarget,
  ZERO_LIMITS,
} from "@/lib/kpiSetStore";
import type { CascadeAssignment } from "@/lib/cascadingStore";
import { getScoreScales, getDefaultScale, type ScoreScale } from "@/lib/evaluationConfigStore";

const TIER_COLORS: Record<LimitTier, string> = {
  l5: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  l4: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  l3: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  l2: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30",
  l1: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
};

// N bal üçün söz təyini: ən yüksək = Əla, ən aşağı = Çox zəif (sonuncu).
const dynamicLabelFor = (score: number, max: number): string => {
  const ratio = score / max;
  if (ratio >= 0.85) return "Əla";
  if (ratio >= 0.65) return "Yaxşı";
  if (ratio >= 0.45) return "Orta";
  if (ratio >= 0.25) return "Zəif";
  return "Çox zəif";
};
const dynamicColorFor = (score: number, max: number): string => {
  const ratio = score / max;
  if (ratio >= 0.85) return TIER_COLORS.l5;
  if (ratio >= 0.65) return TIER_COLORS.l4;
  if (ratio >= 0.45) return TIER_COLORS.l3;
  if (ratio >= 0.25) return TIER_COLORS.l2;
  return TIER_COLORS.l1;
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mode: "edit" | "view";
  subKpiName: string;
  target: string;
  unit: string;
  initial?: LimitSet;
  initialDynamic?: DynamicTier[];
  initialCascadable?: boolean;
  /** Sub-KPI çəkisi və min/max məhdudiyyəti (KPI Set entry-dən) */
  weight?: number;
  weightMin?: number;
  weightMax?: number;
  /** edit rejimində sub-KPI adı/hədəfi/vahidi də redaktə edilə bilər (KPI Set "Gözləyənlər"). */
  editMeta?: boolean;
  /** view rejimində paylanmış (cascade) məlumatı göstərmək üçün */
  cascadeAssignment?: CascadeAssignment;
  onSave?: (
    payload: {
      limits: LimitSet;
      dynamicLimits?: DynamicTier[];
      weight?: number;
      meta?: { subKpiName: string; target: string; unit: string; cascadable: boolean };
    }
  ) => void;
}


const UNIT_OPTIONS = ["AZN", "USD", "EUR", "%", "ədəd", "saat", "gün", "qiymət"];

const ScoreLimitsDialog = ({ open, onOpenChange, mode, subKpiName, target, unit, initial, initialDynamic, initialCascadable, editMeta, weight: weightProp, weightMin, weightMax, cascadeAssignment, onSave }: Props) => {
  const [name, setName] = useState(subKpiName);
  const [tgt, setTgt] = useState(target);
  const [un, setUn] = useState(unit || "AZN");
  const [cascadable, setCascadable] = useState<boolean>(!!initialCascadable);
  const [limits, setLimits] = useState<LimitSet>(initial || ZERO_LIMITS);
  const [dynamicRows, setDynamicRows] = useState<DynamicTier[]>(initialDynamic || []);
  const [scales, setScales] = useState<ScoreScale[]>([]);
  const [scaleId, setScaleId] = useState<string>("");
  const [weight, setWeight] = useState<string>(weightProp != null ? String(weightProp) : "");


  useEffect(() => {
    if (open) {
      setName(subKpiName);
      setTgt(target);
      setUn(unit || "AZN");
      setCascadable(!!initialCascadable);
      setLimits(initial || ZERO_LIMITS);
      setDynamicRows(initialDynamic || []);
      setWeight(weightProp != null ? String(weightProp) : "");
      const list = getScoreScales();
      setScales(list);
      const def = getDefaultScale();
      setScaleId(def.id);
    }
  }, [open, initial, initialDynamic, target, subKpiName, unit, initialCascadable, weightProp]);

  const selectedScale = useMemo(() => scales.find(s => s.id === scaleId) || null, [scales, scaleId]);
  const useDynamic = !!selectedScale && (selectedScale.max !== 5 || selectedScale.min !== 1);

  // Bal şablonu dəyişdikdə dinamik sətirləri qur (yalnız edit rejimində).
  useEffect(() => {
    if (mode !== "edit" || !selectedScale) return;
    if (!useDynamic) { setDynamicRows([]); return; }
    setDynamicRows(prev => {
      const scores: number[] = [];
      for (let s = selectedScale.max; s >= selectedScale.min; s--) scores.push(s);
      return scores.map(s => {
        const existing = prev.find(p => p.score === s);
        return existing || { score: s, label: dynamicLabelFor(s, selectedScale.max), min: 0, max: 0 };
      });
    });
  }, [scaleId, mode, selectedScale, useDynamic]);



  const update = (tier: LimitTier, field: "min" | "max", v: number) => {
    setLimits(prev => ({ ...prev, [tier]: { ...prev[tier], [field]: isNaN(v) ? 0 : v } }));
  };

  const canSave = !editMeta || (name.trim() && tgt.trim() && un.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            {editMeta ? "Sub-KPI və Qiymət Limitləri" : "Qiymət Limitləri"}
            {mode === "view" && <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">Read-only</span>}
          </DialogTitle>
          {!editMeta && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{subKpiName}</span> • Hədəf: {target} {unit}
            </p>
          )}
        </DialogHeader>

        {editMeta && mode === "edit" && (
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12">
              <label className="text-[11px] text-muted-foreground">Sub-KPI adı</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Məs: Online Satış"
                className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background"
              />
            </div>
            <div className="col-span-7">
              <label className="text-[11px] text-muted-foreground">Hədəf</label>
              <input
                value={tgt}
                onChange={e => setTgt(e.target.value)}
                placeholder="Məs: 50000"
                className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background"
              />
            </div>
            <div className="col-span-5">
              <label className="text-[11px] text-muted-foreground">Vahid</label>
              <select
                value={un}
                onChange={e => setUn(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background"
              >
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        )}

        {mode === "edit" && scales.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <label className="text-[11px] text-muted-foreground block mb-1">
              Bal aralığı şablonu (Qiymətləndirmə → Parametrlərdə yaradılır)
            </label>
            <select
              value={scaleId}
              onChange={e => setScaleId(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background"
            >
              {scales.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.min}–{s.max}){s.isDefault ? " · Default" : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">
              "Avtomatik təklif" düyməsi seçilmiş aralığa uyğun limitləri formalaşdırır.
            </p>
          </div>
        )}



        {mode === "edit" && (weightMin != null || weightMax != null || weightProp != null) && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
            <label className="text-[11px] text-muted-foreground block mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Sub-KPI çəkisi (%)
              {(weightMin != null || weightMax != null) && (
                <span className="ml-1 text-foreground font-medium">
                  — icazə verilən: {weightMin ?? 0}% – {weightMax ?? 100}%
                </span>
              )}
            </label>
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              max={weightMax}
              min={weightMin}
              placeholder={`max ${weightMax ?? "—"}`}
              className="w-32 px-2 py-1.5 text-sm border border-border rounded-md bg-background"
            />
            {weight !== "" && weightMax != null && Number(weight) > weightMax && (
              <p className="text-[11px] text-destructive mt-1">Çəki maksimum {weightMax}%-dən çox ola bilməz.</p>
            )}
          </div>
        )}

        {mode === "view" && !initial && !(initialDynamic && initialDynamic.length) ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">Bu sub-KPI üçün hələ <span className="font-medium">KPI Set</span> modulundan limit təyin olunmayıb.</p>
          </div>
        ) : useDynamic && mode === "edit" ? (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1">
              <div className="col-span-5">Səviyyə / Bal</div>
              <div className="col-span-3">Min ({un || "—"})</div>
              <div className="col-span-1 text-center">–</div>
              <div className="col-span-3">Max ({un || "—"})</div>
            </div>
            {dynamicRows.map((row, idx) => (
              <div key={row.score} className={`grid grid-cols-12 gap-2 items-center px-1.5 py-1 rounded-md border ${dynamicColorFor(row.score, selectedScale!.max)}`}>
                <div className="col-span-5 text-sm font-medium">{row.label} ({row.score} bal)</div>
                <input type="number" value={row.min}
                  onChange={e => { const v = Number(e.target.value) || 0; setDynamicRows(d => d.map((r, i) => i === idx ? { ...r, min: v } : r)); }}
                  className="col-span-3 px-2 py-1 text-sm border border-border rounded-md bg-background" />
                <div className="col-span-1 text-center text-muted-foreground">–</div>
                <input type="number" value={row.max}
                  onChange={e => { const v = Number(e.target.value) || 0; setDynamicRows(d => d.map((r, i) => i === idx ? { ...r, max: v } : r)); }}
                  className="col-span-3 px-2 py-1 text-sm border border-border rounded-md bg-background" />
              </div>
            ))}
          </div>
        ) : initialDynamic && initialDynamic.length > 0 && mode === "view" ? (
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {initialDynamic.map((row) => {
              const maxScore = Math.max(...initialDynamic.map(r => r.score));
              return (
                <div key={row.score} className={`grid grid-cols-12 gap-2 items-center px-1.5 py-1 rounded-md border ${dynamicColorFor(row.score, maxScore)}`}>
                  <div className="col-span-5 text-sm font-medium">{row.label} ({row.score} bal)</div>
                  <div className="col-span-3 text-sm tabular-nums">{row.min}</div>
                  <div className="col-span-1 text-center text-muted-foreground">–</div>
                  <div className="col-span-3 text-sm tabular-nums">{row.max}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1">
              <div className="col-span-5">Səviyyə</div>
              <div className="col-span-3">Min ({un || unit || "—"})</div>
              <div className="col-span-1 text-center">–</div>
              <div className="col-span-3">Max ({un || unit || "—"})</div>
            </div>
            {TIER_LABELS.map(({ tier, label }) => {
              const r = limits[tier];
              return (
                <div key={tier} className={`grid grid-cols-12 gap-2 items-center px-1.5 py-1 rounded-md border ${TIER_COLORS[tier]}`}>
                  <div className="col-span-5 text-sm font-medium">{label}</div>
                  <input
                    type="number"
                    readOnly={mode === "view"}
                    value={r.min}
                    onChange={e => update(tier, "min", Number(e.target.value))}
                    className="col-span-3 px-2 py-1 text-sm border border-border rounded-md bg-background disabled:opacity-60"
                  />
                  <div className="col-span-1 text-center text-muted-foreground">–</div>
                  <input
                    type="number"
                    readOnly={mode === "view"}
                    value={r.max}
                    onChange={e => update(tier, "max", Number(e.target.value))}
                    className="col-span-3 px-2 py-1 text-sm border border-border rounded-md bg-background disabled:opacity-60"
                  />
                </div>
              );
            })}
          </div>
        )}

        {editMeta && mode === "edit" && (
          <label className="flex items-start gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/30 cursor-pointer">
            <input
              type="checkbox"
              checked={cascadable}
              onChange={e => setCascadable(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-primary"
            />
            <div>
              <div className="text-sm font-medium text-foreground">Bu hədəf paylaşıla bilər</div>
              <div className="text-[11px] text-muted-foreground">İşarələndikdə Cascading modulunda komandaya bölüşdürülə bilər.</div>
            </div>
          </label>
        )}

        {mode === "view" && cascadeAssignment && cascadeAssignment.slices.length > 0 && (
          <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Share2 className="w-4 h-4 text-primary" />
              Paylanmış (Cascade) — {cascadeAssignment.matrixName || "Matris"}
              <span className="ml-auto text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <Users className="w-3 h-3" /> {cascadeAssignment.slices.length} işçi
              </span>
            </div>
            <div className="space-y-1.5">
              {cascadeAssignment.slices.map(s => (
                <div key={s.id} className="bg-card border border-border rounded-md p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{s.assigneeName}</span>
                    <span className="text-muted-foreground">Pay: <span className="font-semibold text-foreground">{s.target} {cascadeAssignment.unit}</span></span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 mt-1.5">
                    {TIER_LABELS.map(({ tier, label, score }) => {
                      const r = s.limits[tier as LimitTier];
                      return (
                        <div key={tier} className={`rounded px-1 py-1 text-center border ${TIER_COLORS[tier as LimitTier]}`}>
                          <div className="text-[9px] font-semibold">{label.split(" (")[0]} · {score}</div>
                          <div className="text-[10px] font-medium tabular-nums">{r.min}-{r.max}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {mode === "edit" && (
            <Button
              variant="outline"
              onClick={() => {
                const base = suggestLimitsFromTarget(tgt);
                const scale = scales.find(s => s.id === scaleId);
                // Seçilmiş bal aralığı default deyilsə, max-a uyğun proporsional miqyaslandır
                if (scale && !scale.isDefault && scale.max > 0) {
                  const factor = scale.max / 5; // default 5-li sistemə nisbətdə
                  const scaled: LimitSet = { ...base };
                  (Object.keys(scaled) as LimitTier[]).forEach(k => {
                    scaled[k] = {
                      min: Math.round(scaled[k].min * factor),
                      max: Math.round(scaled[k].max * factor),
                    };
                  });
                  setLimits(scaled);
                } else {
                  setLimits(base);
                }
              }}
              className="gap-1.5"
            >
              <Wand2 className="w-4 h-4" /> Avtomatik təklif
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {mode === "view" ? "Bağla" : "Ləğv et"}
          </Button>
          {mode === "edit" && onSave && (
            <Button
              disabled={!canSave || (weight !== "" && weightMax != null && Number(weight) > weightMax)}
              onClick={() => {
                onSave({
                  limits,
                  dynamicLimits: useDynamic ? dynamicRows : undefined,
                  weight: weight === "" ? undefined : Number(weight),
                  meta: editMeta ? { subKpiName: name.trim(), target: tgt.trim(), unit: un.trim(), cascadable } : undefined,
                });
                onOpenChange(false);
              }}
            >
              Yadda saxla
            </Button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default ScoreLimitsDialog;

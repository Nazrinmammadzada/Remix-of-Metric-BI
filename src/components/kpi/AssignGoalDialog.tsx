// Rəhbər · "Məsul olduğum kartlar" — pending KpiSetEntry üçün hədəf təyinetmə pop-up-ı.
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Target as TargetIcon, Sliders, Wand2, GitBranch, Plus, Trash2, AlertTriangle } from "lucide-react";
import { HEDEF_TYPES, CASCADE_TYPES, type HedefType } from "@/components/kpi/CreateKpiWizard";
import {
  setEntryDetails, suggestLimitsFromTarget, TIER_LABELS, ZERO_LIMITS,
  type KpiSetEntry, type LimitSet, type LimitTier, type DynamicTier, type ScoreDescRow,
} from "@/lib/kpiSetStore";
import { getScoreScales, getDefaultScale, type ScoreScale } from "@/lib/evaluationConfigStore";
import { WeightInput } from "@/components/kpi/WeightInput";

// Yalnız Məbləğ üçün vahid seçilə bilər. Digərləri auto-unit.
const AMOUNT_UNITS = ["AZN", "USD", "EUR"];
const AUTO_UNIT: Partial<Record<HedefType, string>> = {
  "Say": "ədəd", "Faiz": "%", "Nisbət": "əmsal",
  "İcra": "bal", "Səriştə": "bal", "Fərdi İnkişaf": "bal",
  "Boolean": "bəli/xeyr", "Zaman": "gün",
};

// Aralıq (min-max) qadağan olan növlər — yalnız bal + təsvir.
const SCORE_DESC_ONLY: HedefType[] = ["İcra", "Fərdi İnkişaf"];
// Zaman: bal + zaman aralığı (timeStart/timeEnd) + təsvir.
const TIME_TYPE: HedefType = "Zaman";

const TIER_COLORS: Record<LimitTier, string> = {
  l5: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  l4: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  l3: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  l2: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/30",
  l1: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
};

const dynLabel = (score: number, max: number) => {
  const r = score / max;
  if (r >= 0.85) return "Əla";
  if (r >= 0.65) return "Yaxşı";
  if (r >= 0.45) return "Orta";
  if (r >= 0.25) return "Zəif";
  return "Çox zəif";
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entry: KpiSetEntry | null;
  onSaved?: (saved: { entryId: string; name: string; value: number; unit: string; cascadable: boolean; type: HedefType }) => void;
}

const AssignGoalDialog = ({ open, onOpenChange, entry, onSaved }: Props) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<HedefType>("Məbləğ");
  const [target, setTarget] = useState("");
  const [unit, setUnit] = useState("AZN");
  const [weight, setWeight] = useState<string>("");
  const [cascadable, setCascadable] = useState(false);
  const [limits, setLimits] = useState<LimitSet>(ZERO_LIMITS);
  const [dyn, setDyn] = useState<DynamicTier[]>([]);
  const [scoreDesc, setScoreDesc] = useState<ScoreDescRow[]>([]);
  const [scales, setScales] = useState<ScoreScale[]>([]);
  const [scaleId, setScaleId] = useState<string>("");

  useEffect(() => {
    if (!open || !entry) return;
    setName(entry.subKpiName || "");
    setType("Məbləğ");
    setTarget(entry.target || "");
    setUnit(entry.unit || "AZN");
    setWeight(entry.weight != null ? String(entry.weight) : "");
    setCascadable(!!entry.cascadable);
    setLimits(entry.limits || ZERO_LIMITS);
    setDyn(entry.dynamicLimits || []);
    setScoreDesc(entry.scoreDescriptions || []);
    const list = getScoreScales();
    setScales(list);
    setScaleId(getDefaultScale().id);
  }, [open, entry?.id]);

  // Növ dəyişdikdə unit-i uyğunlaşdır
  useEffect(() => {
    if (type === "Məbləğ") {
      if (!AMOUNT_UNITS.includes(unit)) setUnit("AZN");
    } else {
      setUnit(AUTO_UNIT[type] || "");
    }
    if (!CASCADE_TYPES.includes(type)) setCascadable(false);
  }, [type]);

  const scale = useMemo(() => scales.find(s => s.id === scaleId), [scales, scaleId]);
  const useDynamic = !!scale && (scale.max !== 5 || scale.min !== 1);
  const scaleMax = scale?.max ?? 5;
  const scaleMin = scale?.min ?? 1;

  const isScoreDescOnly = SCORE_DESC_ONLY.includes(type);
  const isTime = type === TIME_TYPE;
  const isRangeType = !isScoreDescOnly && !isTime;

  // Bal şablonu dəyişdikdə uyğun sıraları qur
  useEffect(() => {
    if (!scale) return;
    if (isRangeType) {
      if (!useDynamic) { setDyn([]); return; }
      const rows: DynamicTier[] = [];
      for (let s = scale.max; s >= scale.min; s--) rows.push({ score: s, label: dynLabel(s, scale.max), min: 0, max: 0 });
      setDyn(rows);
    } else {
      // Score+desc sıraları (bütün bal skalasında)
      setScoreDesc(prev => {
        const scores: number[] = [];
        for (let s = scale.max; s >= scale.min; s--) scores.push(s);
        return scores.map(s => {
          const existing = prev.find(p => p.score === s);
          return existing || { score: s, description: "", timeStart: "", timeEnd: "" };
        });
      });
    }
  }, [scaleId, type]);

  const autofill = () => {
    if (!isRangeType) return;
    const base = suggestLimitsFromTarget(target);
    if (scale && !scale.isDefault && scale.max > 0) {
      const f = scale.max / 5;
      (Object.keys(base) as LimitTier[]).forEach(k => {
        base[k] = { min: Math.round(base[k].min * f), max: Math.round(base[k].max * f) };
      });
    }
    setLimits(base);
    if (useDynamic) {
      const num = parseFloat(String(target).replace(/[^\d.\-]/g, "")) || 0;
      const n = dyn.length || 1;
      const step = num / n;
      setDyn(dyn.map((r, i) => ({ ...r, min: Math.round(step * i), max: Math.round(step * (i + 1)) })));
    }
  };

  // Zaman/İcra/Fərdi İnkişaf üçün: max və "orta məcburi bal" (5/2 və 10/4 kimi)
  const midRequired = Math.max(scaleMin, Math.floor(scaleMax * 0.4));

  const scoreDescError = useMemo(() => {
    if (isRangeType) return null;
    const need = [scaleMax, midRequired];
    for (const s of need) {
      const row = scoreDesc.find(r => r.score === s);
      if (!row) return `${s} balının məlumatı məcburidir`;
      if (isTime) {
        if (!row.timeStart || !row.timeEnd) return `${s} balı üçün zaman aralığı məcburidir`;
      } else {
        if (!row.description?.trim()) return `${s} balının təsviri məcburidir`;
      }
    }
    return null;
  }, [scoreDesc, isRangeType, isTime, scaleMax, midRequired]);

  const canSave = !!(entry && name.trim() && target.trim() && !scoreDescError);

  const handleSave = () => {
    if (!entry || !canSave) return;
    setEntryDetails(entry.id, {
      subKpiName: name.trim(),
      type: type as any,
      target: target.trim(),
      unit,
      cascadable: cascadable && CASCADE_TYPES.includes(type),
      weight: weight ? Number(weight) : undefined,
      limits: isRangeType && !useDynamic ? limits : undefined,
      dynamicLimits: isRangeType && useDynamic ? dyn : undefined,
      scoreDescriptions: !isRangeType ? scoreDesc : undefined,
    });
    onSaved?.({
      entryId: entry.id,
      name: name.trim(),
      value: parseFloat(String(target).replace(/[^\d.\-]/g, "")) || 0,
      unit,
      cascadable: cascadable && CASCADE_TYPES.includes(type),
      type,
    });
    onOpenChange(false);
  };

  const setSD = (score: number, patch: Partial<ScoreDescRow>) =>
    setScoreDesc(prev => prev.map(r => r.score === score ? { ...r, ...patch } : r));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[92vw] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TargetIcon className="w-5 h-5 text-primary" />
            Hədəf təyin et — {entry?.cardName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Əməkdaş: <span className="font-medium text-foreground">{entry?.assigneeName}</span>
          </p>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-12">
            <label className="text-[11px] text-muted-foreground">Hədəfin adı *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Məs: Online Satış Həcmi"
              className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
          </div>
          <div className={type === "Məbləğ" ? "col-span-6 md:col-span-4" : "col-span-6 md:col-span-5"}>
            <label className="text-[11px] text-muted-foreground">Hədəf növü *</label>
            <select value={type} onChange={e => setType(e.target.value as HedefType)}
              className="w-full mt-0.5 px-2 py-1.5 text-sm border border-border rounded bg-background">
              {HEDEF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className={type === "Məbləğ" ? "col-span-6 md:col-span-4" : "col-span-6 md:col-span-5"}>
            <label className="text-[11px] text-muted-foreground">Hədəf dəyəri *</label>
            <input value={target} onChange={e => setTarget(e.target.value)}
              placeholder={type === "Faiz" ? "0-100" : "0"}
              className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
          </div>
          {type === "Məbləğ" && (
            <div className="col-span-6 md:col-span-2">
              <label className="text-[11px] text-muted-foreground">Vahid</label>
              <select value={unit} onChange={e => setUnit(e.target.value)}
                className="w-full mt-0.5 px-2 py-1.5 text-sm border border-border rounded bg-background">
                {AMOUNT_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}
          <div className="col-span-6 md:col-span-2">
            <label className="text-[11px] text-muted-foreground">Çəki (%)</label>
            <WeightInput value={weight === "" ? 0 : Number(weight)} onChange={n => setWeight(String(n))}
              className="mt-0.5" />

          </div>
        </div>

        {/* Qiymət limitləri — bütün növlər üçün mövcuddur */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Sliders className="w-3.5 h-3.5 text-primary" /> Hədəf üçün qiymət limitləri
            </div>
            {scales.length > 0 && (
              <select value={scaleId} onChange={e => setScaleId(e.target.value)}
                className="px-1.5 py-1 text-[11px] border border-border rounded bg-background">
                {scales.map(s => <option key={s.id} value={s.id}>{s.label} ({s.min}–{s.max})</option>)}
              </select>
            )}
            {isRangeType && (
              <Button size="sm" variant="outline" onClick={autofill} className="h-7 gap-1 text-[11px]">
                <Wand2 className="w-3.5 h-3.5" /> Avtomatik
              </Button>
            )}
          </div>

          {/* RANGE TYPES (min-max aralıq) */}
          {isRangeType && (
            useDynamic ? (
              <div className="space-y-1">
                {dyn.map((r, i) => (
                  <div key={r.score} className={`grid grid-cols-12 gap-2 items-center px-1.5 py-1 rounded border ${dynLabel(r.score, scaleMax) === "Əla" ? TIER_COLORS.l5 : dynLabel(r.score, scaleMax) === "Yaxşı" ? TIER_COLORS.l4 : dynLabel(r.score, scaleMax) === "Orta" ? TIER_COLORS.l3 : dynLabel(r.score, scaleMax) === "Zəif" ? TIER_COLORS.l2 : TIER_COLORS.l1}`}>
                    <div className="col-span-5 text-xs font-medium">{r.label} ({r.score} bal)</div>
                    <input type="number" value={r.min}
                      onChange={e => setDyn(d => d.map((x, ix) => ix === i ? { ...x, min: Number(e.target.value) || 0 } : x))}
                      className="col-span-3 px-1.5 py-1 text-xs border border-border rounded bg-background" />
                    <div className="col-span-1 text-center text-muted-foreground">–</div>
                    <input type="number" value={r.max}
                      onChange={e => setDyn(d => d.map((x, ix) => ix === i ? { ...x, max: Number(e.target.value) || 0 } : x))}
                      className="col-span-3 px-1.5 py-1 text-xs border border-border rounded bg-background" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {TIER_LABELS.map(({ tier, label }) => {
                  const r = limits[tier];
                  return (
                    <div key={tier} className={`grid grid-cols-12 gap-2 items-center px-1.5 py-1 rounded border ${TIER_COLORS[tier]}`}>
                      <div className="col-span-5 text-xs font-medium">{label}</div>
                      <input type="number" value={r.min}
                        onChange={e => setLimits(p => ({ ...p, [tier]: { ...p[tier], min: Number(e.target.value) || 0 } }))}
                        className="col-span-3 px-1.5 py-1 text-xs border border-border rounded bg-background" />
                      <div className="col-span-1 text-center text-muted-foreground">–</div>
                      <input type="number" value={r.max}
                        onChange={e => setLimits(p => ({ ...p, [tier]: { ...p[tier], max: Number(e.target.value) || 0 } }))}
                        className="col-span-3 px-1.5 py-1 text-xs border border-border rounded bg-background" />
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* SCORE + DESCRIPTION (İcra / Fərdi İnkişaf) */}
          {isScoreDescOnly && (
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground px-1">
                Yalnız bal və təsvir. <span className="text-amber-600">{scaleMax} və {midRequired} balının təsviri məcburidir.</span>
              </div>
              {scoreDesc.map(r => {
                const required = r.score === scaleMax || r.score === midRequired;
                return (
                  <div key={r.score} className="grid grid-cols-12 gap-2 items-center px-1.5 py-1 rounded border border-border bg-card">
                    <div className="col-span-2 text-xs font-medium">
                      {r.score} bal {required && <span className="text-destructive">*</span>}
                    </div>
                    <input value={r.description || ""} onChange={e => setSD(r.score, { description: e.target.value })}
                      placeholder={required ? "Təsvir (məcburi)" : "Təsvir (opsional)"}
                      className="col-span-10 px-2 py-1 text-xs border border-border rounded bg-background" />
                  </div>
                );
              })}
            </div>
          )}

          {/* TIME TYPE (Zaman) */}
          {isTime && (
            <div className="space-y-1">
              <div className="text-[10px] text-muted-foreground px-1">
                Zaman aralığı seçilir, qarşısında balı və opsional təsvir.
                <span className="text-amber-600 ml-1">{scaleMax} və {midRequired} balı məcburidir.</span>
              </div>
              <div className="grid grid-cols-12 gap-1 text-[10px] font-medium text-muted-foreground uppercase px-1">
                <div className="col-span-2">Bal</div>
                <div className="col-span-3">Başlanğıc</div>
                <div className="col-span-3">Bitmə</div>
                <div className="col-span-4">Təsvir (ops.)</div>
              </div>
              {scoreDesc.map(r => {
                const required = r.score === scaleMax || r.score === midRequired;
                return (
                  <div key={r.score} className="grid grid-cols-12 gap-1 items-center px-1 py-1 rounded border border-border bg-card">
                    <div className="col-span-2 text-xs font-medium">
                      {r.score} {required && <span className="text-destructive">*</span>}
                    </div>
                    <input type="time" value={r.timeStart || ""} onChange={e => setSD(r.score, { timeStart: e.target.value })}
                      className="col-span-3 px-1.5 py-1 text-xs border border-border rounded bg-background" />
                    <input type="time" value={r.timeEnd || ""} onChange={e => setSD(r.score, { timeEnd: e.target.value })}
                      className="col-span-3 px-1.5 py-1 text-xs border border-border rounded bg-background" />
                    <input value={r.description || ""} onChange={e => setSD(r.score, { description: e.target.value })}
                      placeholder="—"
                      className="col-span-4 px-1.5 py-1 text-xs border border-border rounded bg-background" />
                  </div>
                );
              })}
            </div>
          )}

          {scoreDescError && (
            <div className="text-[11px] text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {scoreDescError}
            </div>
          )}
        </div>

        {/* Cascadable */}
        {CASCADE_TYPES.includes(type) && (
          <label className="flex items-start gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 cursor-pointer">
            <input type="checkbox" checked={cascadable} onChange={e => setCascadable(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-primary" />
            <div>
              <div className="text-sm font-medium text-foreground inline-flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-primary" /> Bu hədəf kaskadlana bilər
              </div>
              <div className="text-[11px] text-muted-foreground">
                İşarələndikdə bu kartın aid olduğu rəhbər şəxslər hədəfi öz tabeliyindəki əməkdaşlar arasında paylaya bilər.
              </div>
            </div>
          </label>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ləğv et</Button>
          <Button onClick={handleSave} disabled={!canSave}>Yadda saxla</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignGoalDialog;

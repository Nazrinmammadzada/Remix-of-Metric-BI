import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCatalogValues } from "@/lib/dropdownCatalogStore";
import { getEmployees } from "@/lib/orgStore";
import { useCascadeMatrices } from "@/lib/cascadeMatrixStore";
import {
  ChevronLeft, ChevronRight, Sparkles, CalendarDays, Users, User,
  ShieldCheck, Target as TargetIcon, Trash2, Plus, GitBranch, UserPlus,
  Search, ClipboardList, Save, Power,
} from "lucide-react";
import { toast } from "sonner";

// ============ TYPES ============
export type HedefType =
  | "Məbləğ" | "Say" | "İcra" | "Səriştə" | "Fərdi İnkişaf"
  | "Faiz" | "Nisbət" | "Boolean" | "Zaman";

export const HEDEF_TYPES: HedefType[] = [
  "Məbləğ", "Say", "İcra", "Səriştə", "Fərdi İnkişaf",
  "Faiz", "Nisbət", "Boolean", "Zaman",
];

export const CASCADE_TYPES: HedefType[] = ["Məbləğ", "Say", "Faiz", "Nisbət"];

export interface WizardHedef {
  id: string;
  name: string;
  type: HedefType;
  weight: number;
  scoreLimit: number; // Qiymətləndirmə balı (per-target)

  // Per-target qiymətləndirici və təyin edici (əməkdaş)
  evaluator: string;
  assigner: string;

  // Type-specific evaluation
  min: string;
  max: string;
  currency: "AZN" | "USD" | "EUR";
  competencyMatrix: string;
  freeInput: string;
  booleanYes: number;
  booleanNo: number;
  timeStart: string;
  timeEnd: string;

  // Cascade (yalnız Məbləğ/Say/Faiz/Nisbət üçün)
  cascading: boolean;
  cascadeMatrix: string;
}

export type AssigneeKind = "Şəxs" | "Komanda" | "Struktur" | "Vəzifə";

export interface WizardAssignTarget {
  id: string;
  kind: AssigneeKind;
  value: string;
}

export interface WizardEvaluator {
  id: string;
  name: string;
  weight: number;
}

export type CreatedBy = "self" | "other";

export interface WizardLifecycleReview {
  id: string;
  name: string;
  start: string;
  end: string;
}

export type WizardAction = "draft" | "create" | "create_active";

export interface CreateKpiWizardDraft {
  name: string;
  mode: "individual" | "bulk";
  frequency: string; // Aylıq / Rüblük / 6 Aylıq / İllik / Custom
  startDate: string;
  endDate: string;
  scoringSystem: string; // 1-5 / 1-10 / Digər
  useMatrix: boolean;

  lifecycle: {
    assignmentDeadline: string;
    reviews: WizardLifecycleReview[];
    evaluationStart: string;
    evaluationEnd: string;
  };

  targets: WizardHedef[];

  createdBy: CreatedBy;
  createdByEmployee: string;
  evaluators: WizardEvaluator[];
  assignTargets: WizardAssignTarget[];

  action?: WizardAction;
}

export const emptyKpiWizardDraft = (): CreateKpiWizardDraft => ({
  name: "",
  mode: "individual",
  frequency: "Aylıq",
  startDate: "",
  endDate: "",
  scoringSystem: "1-5",
  useMatrix: false,
  lifecycle: {
    assignmentDeadline: "",
    reviews: [],
    evaluationStart: "",
    evaluationEnd: "",
  },
  targets: [],
  createdBy: "self",
  createdByEmployee: "",
  evaluators: [],
  assignTargets: [],
});

const emptyHedef = (): WizardHedef => ({
  id: crypto.randomUUID(),
  name: "",
  type: "Məbləğ",
  weight: 0,
  scoreLimit: 5,
  evaluator: "",
  assigner: "",
  min: "",
  max: "",
  currency: "AZN",
  competencyMatrix: "",
  freeInput: "",
  booleanYes: 5,
  booleanNo: 2,
  timeStart: "",
  timeEnd: "",
  cascading: false,
  cascadeMatrix: "",
});

const STEPS = [
  { n: 1, title: "Əsas məlumatlar", sub: "KPI adı, dövr, tarixlər və lifecycle", icon: Sparkles },
  { n: 2, title: "Hədəflər", sub: "Hədəf növləri, çəkilər və qiymətləndirmə", icon: TargetIcon },
  { n: 3, title: "Təyinatlar", sub: "Yaradıcı, qiymətləndiricilər və kimə təyin", icon: UserPlus },
  { n: 4, title: "Yekun və təsdiq", sub: "Bütün məlumatları nəzərdən keçirin", icon: ClipboardList },
];
const TOTAL_STEPS = STEPS.length;

const PERIODS = ["Aylıq", "Rüblük", "6 Aylıq", "İllik", "Custom"];
const SCORING = ["1-5", "1-10", "Digər"];
const CURRENCIES: WizardHedef["currency"][] = ["AZN", "USD", "EUR"];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<CreateKpiWizardDraft>;
  onComplete: (draft: CreateKpiWizardDraft) => void;
}

export default function CreateKpiWizard({ open, onOpenChange, initial, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<CreateKpiWizardDraft>(() => ({ ...emptyKpiWizardDraft(), ...(initial || {}) }));

  // Re-seed when dialog re-opens with a new "initial" (e.g. copy)
  useEffect(() => {
    if (open) {
      setStep(1);
      setDraft({ ...emptyKpiWizardDraft(), ...(initial || {}) });
    }
  }, [open, initial]);

  const scoringExtra = useCatalogValues("scoring_systems", ["1-3 Bal", "Faiz (0-100)"]);
  const cascadeMatrices = useCascadeMatrices();
  const activeEmployees = useMemo(
    () => getEmployees().filter(e => e.active).map(e => ({
      id: e.id,
      label: `${e.firstName} ${e.lastName}${e.positionName ? " — " + e.positionName : ""}`,
    })),
    [open],
  );
  const [empSearch, setEmpSearch] = useState("");
  const filteredEmployees = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    if (!q) return activeEmployees;
    return activeEmployees.filter(e => e.label.toLowerCase().includes(q));
  }, [empSearch, activeEmployees]);

  // Per-target picker open state: `${hedefId}:${role}` where role = "eval" | "assign"
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const pickerEmployees = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return activeEmployees;
    return activeEmployees.filter(e => e.label.toLowerCase().includes(q));
  }, [pickerSearch, activeEmployees]);

  const update = (patch: Partial<CreateKpiWizardDraft>) => setDraft(p => ({ ...p, ...patch }));
  const updLifecycle = (patch: Partial<CreateKpiWizardDraft["lifecycle"]>) =>
    setDraft(p => ({ ...p, lifecycle: { ...p.lifecycle, ...patch } }));

  // ====== HƏDƏF ======
  const updHedef = (id: string, patch: Partial<WizardHedef>) =>
    setDraft(p => ({ ...p, targets: p.targets.map(t => t.id === id ? { ...t, ...patch } : t) }));
  const addHedef = () => setDraft(p => ({ ...p, targets: [...p.targets, emptyHedef()] }));
  const removeHedef = (id: string) => setDraft(p => ({ ...p, targets: p.targets.filter(t => t.id !== id) }));
  const applyPersonToAll = (role: "evaluator" | "assigner", name: string) =>
    setDraft(p => ({ ...p, targets: p.targets.map(t => ({ ...t, [role]: name })) }));
  const totalWeight = useMemo(() => draft.targets.reduce((s, t) => s + (Number(t.weight) || 0), 0), [draft.targets]);

  // ====== REVIEWS ======
  const addReview = () => updLifecycle({
    reviews: [...draft.lifecycle.reviews, { id: crypto.randomUUID(), name: `Review ${draft.lifecycle.reviews.length + 1}`, start: "", end: "" }],
  });
  const updReview = (id: string, patch: Partial<WizardLifecycleReview>) =>
    updLifecycle({ reviews: draft.lifecycle.reviews.map(r => r.id === id ? { ...r, ...patch } : r) });
  const removeReview = (id: string) =>
    updLifecycle({ reviews: draft.lifecycle.reviews.filter(r => r.id !== id) });

  // ====== EVALUATORS ======
  const addEvaluator = () => update({
    evaluators: [...draft.evaluators, { id: crypto.randomUUID(), name: "", weight: 0 }],
  });
  const updEvaluator = (id: string, patch: Partial<WizardEvaluator>) =>
    update({ evaluators: draft.evaluators.map(e => e.id === id ? { ...e, ...patch } : e) });
  const removeEvaluator = (id: string) => update({ evaluators: draft.evaluators.filter(e => e.id !== id) });
  const evalWeight = useMemo(() => draft.evaluators.reduce((s, e) => s + (Number(e.weight) || 0), 0), [draft.evaluators]);

  // ====== ASSIGN TARGETS ======
  const allowedKinds: AssigneeKind[] = draft.mode === "individual"
    ? ["Şəxs", "Komanda", "Struktur", "Vəzifə"]
    : ["Komanda", "Struktur", "Vəzifə"];
  const addAssignTarget = () => update({
    assignTargets: [...draft.assignTargets, { id: crypto.randomUUID(), kind: allowedKinds[0], value: "" }],
  });
  const updAssignTarget = (id: string, patch: Partial<WizardAssignTarget>) =>
    update({ assignTargets: draft.assignTargets.map(a => a.id === id ? { ...a, ...patch } : a) });
  const removeAssignTarget = (id: string) =>
    update({ assignTargets: draft.assignTargets.filter(a => a.id !== id) });

  // ====== VALIDATION ======
  const validateHedef = (t: WizardHedef): string | null => {
    if (!t.name.trim()) return "Hədəf adı boşdur";
    if (!t.weight || t.weight <= 0) return "Hədəf çəkisi 0-dan böyük olmalıdır";
    if (["Məbləğ", "Say", "Faiz", "Nisbət"].includes(t.type)) {
      if (t.min === "" || t.max === "") return `${t.type}: Min və Max tələb olunur`;
      if (Number(t.min) > Number(t.max)) return `${t.type}: Min Max-dan kiçik olmalıdır`;
    }
    if (t.type === "Səriştə" && !t.competencyMatrix) return "Səriştə: Competency Matrix seçilməlidir";
    if (t.type === "Zaman" && (!t.timeStart || !t.timeEnd)) return "Zaman: tarix aralığı tələb olunur";
    if (t.type === "İcra" && !t.freeInput.trim()) return "İcra: dəyər tələb olunur";
    if (t.type === "Fərdi İnkişaf" && !t.freeInput.trim()) return "Fərdi İnkişaf: dəyər tələb olunur";
    return null;
  };

  const canNext = useMemo(() => {
    switch (step) {
      case 1:
        return !!draft.name.trim()
          && !!draft.frequency
          && !!draft.startDate
          && !!draft.endDate
          && draft.endDate >= draft.startDate
          && !!draft.scoringSystem
          && !!draft.lifecycle.assignmentDeadline
          && !!draft.lifecycle.evaluationStart
          && !!draft.lifecycle.evaluationEnd;
      case 2:
        return draft.targets.length > 0
          && totalWeight === 100
          && draft.targets.every(t => validateHedef(t) === null);
      case 3:
        if (draft.createdBy === "other" && !draft.createdByEmployee) return false;
        if (draft.evaluators.length === 0) return false;
        if (draft.evaluators.some(e => !e.name)) return false;
        if (draft.evaluators.length > 1 && evalWeight !== 100) return false;
        if (draft.assignTargets.length === 0) return false;
        if (draft.assignTargets.some(a => !a.value.trim())) return false;
        return true;
      case 4: return true;
      default: return false;
    }
  }, [step, draft, totalWeight, evalWeight]);

  const close = () => {
    onOpenChange(false);
    setTimeout(() => { setStep(1); setDraft({ ...emptyKpiWizardDraft(), ...(initial || {}) }); }, 200);
  };

  const handleNext = () => {
    if (!canNext) {
      if (step === 1) toast.error("Bütün tələb olunan sahələri doldurun");
      else if (step === 2) {
        const first = draft.targets.map(validateHedef).find(Boolean);
        if (first) toast.error(first);
        else if (totalWeight !== 100) toast.error(`Hədəf çəkilərinin cəmi 100% olmalıdır (hazırda ${totalWeight}%)`);
        else toast.error("Ən az bir hədəf əlavə edin");
      } else if (step === 3) {
        if (draft.evaluators.length > 1 && evalWeight !== 100) toast.error(`Qiymətləndirici çəkilərinin cəmi 100% olmalıdır (hazırda ${evalWeight}%)`);
        else toast.error("Təyinat məlumatlarını tamamlayın");
      }
      return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const finalize = (action: WizardAction) => {
    if (!canNext && step === TOTAL_STEPS) return;
    onComplete({ ...draft, action });
    toast.success(
      action === "draft" ? "Qaralama olaraq saxlanıldı"
      : action === "create_active" ? "KPI yaradıldı və aktiv edildi"
      : "KPI kartı yaradıldı",
    );
    close();
  };

  // ====== UI helpers ======
  const Field = ({ label, required, children, span = "col-span-12 md:col-span-6" }:
    { label: string; required?: boolean; children: React.ReactNode; span?: string }) => (
    <div className={span}>
      <label className="text-sm font-medium text-foreground">{label}{required && <span className="text-destructive"> *</span>}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); else onOpenChange(true); }}>
      <DialogContent className="max-w-6xl w-[97vw] max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Yeni KPI — Addım {step}/{TOTAL_STEPS}: {STEPS[step - 1].title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{STEPS[step - 1].sub}</p>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex gap-2 mb-4 mt-2">
          {STEPS.map(s => (
            <div key={s.n} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${s.n < step ? "bg-primary" : s.n === step ? "bg-primary/80" : "bg-muted"}`} />
              <div className={`text-[11px] mt-1 ${s.n === step ? "text-primary font-medium" : "text-muted-foreground"}`}>{s.n}. {s.title}</div>
            </div>
          ))}
        </div>

        <div className="min-h-[420px]">
          {/* ===== STEP 1 ===== */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-12 gap-4">
                <Field label="KPI adı" required span="col-span-12">
                  <input autoFocus value={draft.name} onChange={e => update({ name: e.target.value })}
                    placeholder="Məsələn: Aylıq Satış Hədəfi 2026"
                    className="w-full px-4 py-2.5 text-base border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/40 outline-none" />
                </Field>

                <Field label="KPI təyinat növü" required>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { v: "individual" as const, t: "Fərdi", icon: User },
                      { v: "bulk" as const, t: "Toplu", icon: Users },
                    ]).map(o => {
                      const Icon = o.icon;
                      const active = draft.mode === o.v;
                      return (
                        <button key={o.v} type="button" onClick={() => update({ mode: o.v })}
                          className={`p-2.5 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${active ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30" : "border-border bg-card hover:border-primary/40"}`}>
                          <Icon className="w-4 h-4" />{o.t}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Dövr" required>
                  <select value={draft.frequency} onChange={e => update({ frequency: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background">
                    {PERIODS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>

                <Field label="Başlama tarixi" required span="col-span-12 md:col-span-4">
                  <input type="date" value={draft.startDate} onChange={e => update({ startDate: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background" />
                </Field>
                <Field label="Bitmə tarixi" required span="col-span-12 md:col-span-4">
                  <input type="date" min={draft.startDate || undefined} value={draft.endDate} onChange={e => update({ endDate: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background" />
                </Field>
                <Field label="Qiymətləndirmə bal sistemi" required span="col-span-12 md:col-span-4">
                  <select value={draft.scoringSystem} onChange={e => update({ scoringSystem: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-background">
                    {[...SCORING, ...scoringExtra.filter(x => !SCORING.includes(x))].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>

                <div className="col-span-12">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${draft.useMatrix ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                    <input type="checkbox" checked={draft.useMatrix} onChange={e => update({ useMatrix: e.target.checked })} className="w-5 h-5 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-foreground flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Təsdiqləmə matrisi tətbiq olunsun?
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Aktiv olduqda təyinatlar bitdikdən sonra kart "Təsdiq gözlənilir" statusuna keçəcək.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Lifecycle */}
              <div className="rounded-lg border border-border bg-card/40 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">KPI Lifecycle</h3>
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <Field label="Assignment Deadline" required span="col-span-12 md:col-span-4">
                    <input type="date" value={draft.lifecycle.assignmentDeadline}
                      onChange={e => updLifecycle({ assignmentDeadline: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
                  </Field>
                  <Field label="Qiymətləndirmə başlanğıcı" required span="col-span-12 md:col-span-4">
                    <input type="date" value={draft.lifecycle.evaluationStart}
                      onChange={e => updLifecycle({ evaluationStart: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
                  </Field>
                  <Field label="Qiymətləndirmə bitmə" required span="col-span-12 md:col-span-4">
                    <input type="date" value={draft.lifecycle.evaluationEnd}
                      onChange={e => updLifecycle({ evaluationEnd: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
                  </Field>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-foreground">Review dövrləri</label>
                    <button type="button" onClick={addReview} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground">
                      <Plus className="w-3.5 h-3.5" /> Review əlavə et
                    </button>
                  </div>
                  {draft.lifecycle.reviews.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Review əlavə edilməyib.</p>
                  ) : (
                    <div className="space-y-2">
                      {draft.lifecycle.reviews.map((r, i) => (
                        <div key={r.id} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-12 md:col-span-4">
                            <label className="text-[11px] text-muted-foreground">Review #{i + 1} adı</label>
                            <input value={r.name} onChange={e => updReview(r.id, { name: e.target.value })}
                              className="w-full mt-0.5 px-2.5 py-2 text-sm border border-border rounded bg-background" />
                          </div>
                          <div className="col-span-6 md:col-span-3">
                            <label className="text-[11px] text-muted-foreground">Başlama</label>
                            <input type="date" value={r.start} onChange={e => updReview(r.id, { start: e.target.value })}
                              className="w-full mt-0.5 px-2 py-2 text-sm border border-border rounded bg-background" />
                          </div>
                          <div className="col-span-6 md:col-span-3">
                            <label className="text-[11px] text-muted-foreground">Bitmə</label>
                            <input type="date" value={r.end} onChange={e => updReview(r.id, { end: e.target.value })}
                              className="w-full mt-0.5 px-2 py-2 text-sm border border-border rounded bg-background" />
                          </div>
                          <div className="col-span-12 md:col-span-2">
                            <button type="button" onClick={() => removeReview(r.id)}
                              className="w-full px-2 py-2 text-xs rounded border border-border text-destructive hover:bg-destructive/10">
                              Sil
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 2: HƏDƏFLƏR ===== */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">KPI Hədəfləri</h3>
                  <p className="text-xs text-muted-foreground">9 hədəf növü · ümumi çəki 100% olmalıdır</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${totalWeight === 100 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                    Ümumi çəki: {totalWeight}%
                  </span>
                  <button type="button" onClick={addHedef} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">
                    <Plus className="w-3.5 h-3.5" /> Hədəf əlavə et
                  </button>
                </div>
              </div>

              {draft.targets.length === 0 && (
                <div className="text-center py-12 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
                  Hələ hədəf əlavə edilməyib — "Hədəf əlavə et" düyməsindən başlayın.
                </div>
              )}

              {draft.targets.map((t, idx) => {
                const showMinMax = ["Məbləğ", "Say", "Faiz", "Nisbət"].includes(t.type);
                const showCascade = CASCADE_TYPES.includes(t.type);
                return (
                  <div key={t.id} className="relative p-4 rounded-lg border border-border bg-card/40 space-y-3">
                    <button type="button" title="Sil" onClick={() => removeHedef(t.id)}
                      className="absolute top-2 right-2 p-1.5 rounded hover:bg-destructive/10 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-xs font-semibold text-muted-foreground">Hədəf #{idx + 1}</div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 md:col-span-5">
                        <label className="text-[11px] text-muted-foreground">Hədəf adı *</label>
                        <input value={t.name} onChange={e => updHedef(t.id, { name: e.target.value })}
                          placeholder="Məsələn: Rüblük satış həcmi"
                          className="w-full mt-0.5 px-2.5 py-2 text-sm border border-border rounded bg-background" />
                      </div>
                      <div className="col-span-8 md:col-span-4">
                        <label className="text-[11px] text-muted-foreground">Hədəf növü *</label>
                        <select value={t.type} onChange={e => updHedef(t.id, { type: e.target.value as HedefType })}
                          className="w-full mt-0.5 px-2 py-2 text-sm border border-border rounded bg-background">
                          {HEDEF_TYPES.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div className="col-span-4 md:col-span-3">
                        <label className="text-[11px] text-muted-foreground">Çəki (%) *</label>
                        <input type="number" min={0} max={100} value={t.weight}
                          onChange={e => updHedef(t.id, { weight: Number(e.target.value) })}
                          className="w-full mt-0.5 px-2.5 py-2 text-sm border border-border rounded bg-background" />
                      </div>
                    </div>

                    {/* Type-specific eval fields */}
                    <div className="rounded-md bg-secondary/30 border border-border/60 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Qiymətləndirmə — {t.type}</div>

                      {showMinMax && (
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-6 md:col-span-4">
                            <label className="text-[11px] text-muted-foreground">Min *</label>
                            <input type="number" value={t.min} onChange={e => updHedef(t.id, { min: e.target.value })}
                              className="w-full mt-0.5 px-2.5 py-2 text-sm border border-border rounded bg-background" />
                          </div>
                          <div className="col-span-6 md:col-span-4">
                            <label className="text-[11px] text-muted-foreground">Max *</label>
                            <input type="number" value={t.max} onChange={e => updHedef(t.id, { max: e.target.value })}
                              className="w-full mt-0.5 px-2.5 py-2 text-sm border border-border rounded bg-background" />
                          </div>
                          {t.type === "Məbləğ" && (
                            <div className="col-span-12 md:col-span-4">
                              <label className="text-[11px] text-muted-foreground">Valyuta</label>
                              <select value={t.currency} onChange={e => updHedef(t.id, { currency: e.target.value as WizardHedef["currency"] })}
                                className="w-full mt-0.5 px-2 py-2 text-sm border border-border rounded bg-background">
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      {t.type === "İcra" && (
                        <input value={t.freeInput} onChange={e => updHedef(t.id, { freeInput: e.target.value })}
                          placeholder="Sərbəst dəyər"
                          className="w-full px-2.5 py-2 text-sm border border-border rounded bg-background" />
                      )}

                      {t.type === "Səriştə" && (
                        <div className="space-y-2">
                          <p className="text-[11px] text-muted-foreground italic">Goal Name və Goal Value bu növ üçün edit edilmir.</p>
                          <select value={t.competencyMatrix} onChange={e => updHedef(t.id, { competencyMatrix: e.target.value })}
                            className="w-full px-2.5 py-2 text-sm border border-border rounded bg-background">
                            <option value="">— Competency Matrix seçin —</option>
                            <option value="Liderlik">Liderlik</option>
                            <option value="Texniki Səriştə">Texniki Səriştə</option>
                            <option value="Kommunikasiya">Kommunikasiya</option>
                            <option value="Komanda işi">Komanda işi</option>
                          </select>
                        </div>
                      )}

                      {t.type === "Fərdi İnkişaf" && (
                        <input value={t.freeInput} onChange={e => updHedef(t.id, { freeInput: e.target.value })}
                          placeholder="Sərbəst dəyər"
                          className="w-full px-2.5 py-2 text-sm border border-border rounded bg-background" />
                      )}

                      {t.type === "Boolean" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-muted-foreground">Bəli =</label>
                            <input type="number" value={t.booleanYes} onChange={e => updHedef(t.id, { booleanYes: Number(e.target.value) })}
                              className="w-full mt-0.5 px-2.5 py-2 text-sm border border-border rounded bg-background" />
                          </div>
                          <div>
                            <label className="text-[11px] text-muted-foreground">Xeyr =</label>
                            <input type="number" value={t.booleanNo} onChange={e => updHedef(t.id, { booleanNo: Number(e.target.value) })}
                              className="w-full mt-0.5 px-2.5 py-2 text-sm border border-border rounded bg-background" />
                          </div>
                        </div>
                      )}

                      {t.type === "Zaman" && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-muted-foreground">Başlama *</label>
                            <input type="date" value={t.timeStart} onChange={e => updHedef(t.id, { timeStart: e.target.value })}
                              className="w-full mt-0.5 px-2 py-2 text-sm border border-border rounded bg-background" />
                          </div>
                          <div>
                            <label className="text-[11px] text-muted-foreground">Bitmə *</label>
                            <input type="date" value={t.timeEnd} onChange={e => updHedef(t.id, { timeEnd: e.target.value })}
                              className="w-full mt-0.5 px-2 py-2 text-sm border border-border rounded bg-background" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cascade — yalnız Məbləğ/Say/Faiz/Nisbət */}
                    {showCascade && (
                      <div className="rounded-md border border-border/60 p-3 bg-background/40 space-y-2">
                        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                          <input type="checkbox" checked={t.cascading}
                            onChange={e => updHedef(t.id, { cascading: e.target.checked, cascadeMatrix: e.target.checked ? t.cascadeMatrix : "" })}
                            className="w-4 h-4" />
                          <GitBranch className="w-3.5 h-3.5 text-primary" />
                          Bu hədəf üzrə cascade tətbiq olunsun
                        </label>
                        {t.cascading && (
                          <select value={t.cascadeMatrix} onChange={e => updHedef(t.id, { cascadeMatrix: e.target.value })}
                            className="w-full px-2.5 py-2 text-sm border border-border rounded bg-background">
                            <option value="">— Cascade Matrix seçin —</option>
                            {cascadeMatrices.map(m => <option key={m.id} value={m.name}>{m.name} ({m.scopeType})</option>)}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== STEP 3: TƏYİNATLAR ===== */}
          {step === 3 && (
            <div className="space-y-5">
              {/* KPI-ni təyin edən */}
              <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">KPI-ni təyin edən</h3>
                <div className="flex gap-2">
                  {([
                    { v: "self" as const, t: "Özüm" },
                    { v: "other" as const, t: "Digər əməkdaş" },
                  ]).map(o => {
                    const active = draft.createdBy === o.v;
                    return (
                      <button key={o.v} type="button"
                        onClick={() => update({ createdBy: o.v, createdByEmployee: o.v === "self" ? "" : draft.createdByEmployee })}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium ${active ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30" : "border-border bg-card hover:border-primary/40"}`}>
                        {o.t}
                      </button>
                    );
                  })}
                </div>
                {draft.createdBy === "other" && (
                  <div>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                        placeholder="Əməkdaş adı ilə axtarın..."
                        className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded bg-background" />
                    </div>
                    <select value={draft.createdByEmployee} onChange={e => update({ createdByEmployee: e.target.value })}
                      className="w-full mt-2 px-2.5 py-2 text-sm border border-border rounded bg-background">
                      <option value="">— Aktiv əməkdaş seçin —</option>
                      {filteredEmployees.map(e => <option key={e.id} value={e.label}>{e.label}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Qiymətləndiricilər */}
              <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Qiymətləndiricilər</h3>
                  <div className="flex items-center gap-2">
                    {draft.evaluators.length > 1 && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${evalWeight === 100 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                        Çəki cəmi: {evalWeight}%
                      </span>
                    )}
                    <button type="button" onClick={addEvaluator}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground">
                      <Plus className="w-3.5 h-3.5" /> Qiymətləndirici əlavə et
                    </button>
                  </div>
                </div>

                {draft.evaluators.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Ən az bir qiymətləndirici əlavə edin.</p>
                ) : (
                  <div className="space-y-2">
                    {draft.evaluators.map((ev, i) => (
                      <div key={ev.id} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-12 md:col-span-8">
                          <label className="text-[11px] text-muted-foreground">Qiymətləndirici #{i + 1}</label>
                          <select value={ev.name} onChange={e => updEvaluator(ev.id, { name: e.target.value })}
                            className="w-full mt-0.5 px-2.5 py-2 text-sm border border-border rounded bg-background">
                            <option value="">— Aktiv əməkdaş seçin —</option>
                            {activeEmployees.map(emp => <option key={emp.id} value={emp.label}>{emp.label}</option>)}
                          </select>
                        </div>
                        <div className="col-span-8 md:col-span-3">
                          <label className="text-[11px] text-muted-foreground">Çəki (%) {draft.evaluators.length > 1 && "*"}</label>
                          <input type="number" min={0} max={100} value={ev.weight}
                            onChange={e => updEvaluator(ev.id, { weight: Number(e.target.value) })}
                            disabled={draft.evaluators.length === 1}
                            className="w-full mt-0.5 px-2.5 py-2 text-sm border border-border rounded bg-background disabled:opacity-50" />
                        </div>
                        <div className="col-span-4 md:col-span-1">
                          <button type="button" onClick={() => removeEvaluator(ev.id)}
                            className="w-full px-2 py-2 rounded border border-border text-destructive hover:bg-destructive/10 flex items-center justify-center">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* KPI kimə təyin olunur */}
              <div className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">KPI kimə təyin olunur</h3>
                    <p className="text-xs text-muted-foreground">
                      {draft.mode === "individual"
                        ? "Fərdi rejim: Şəxs / Komanda / Struktur / Vəzifə"
                        : "Toplu rejim: Komanda / Struktur / Vəzifə"}
                    </p>
                  </div>
                  <button type="button" onClick={addAssignTarget}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground">
                    <Plus className="w-3.5 h-3.5" /> Təyinat əlavə et
                  </button>
                </div>

                {draft.assignTargets.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Ən az bir təyinat əlavə edin.</p>
                ) : (
                  <div className="space-y-2">
                    {draft.assignTargets.map(a => (
                      <div key={a.id} className="flex gap-2 items-center">
                        <select value={a.kind}
                          onChange={e => updAssignTarget(a.id, { kind: e.target.value as AssigneeKind, value: "" })}
                          className="px-2 py-2 text-sm border border-border rounded bg-background w-32">
                          {allowedKinds.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                        {a.kind === "Şəxs" ? (
                          <select value={a.value} onChange={e => updAssignTarget(a.id, { value: e.target.value })}
                            className="flex-1 px-2.5 py-2 text-sm border border-border rounded bg-background">
                            <option value="">— Aktiv əməkdaş seçin —</option>
                            {activeEmployees.map(emp => <option key={emp.id} value={emp.label}>{emp.label}</option>)}
                          </select>
                        ) : (
                          <input value={a.value} onChange={e => updAssignTarget(a.id, { value: e.target.value })}
                            placeholder={`${a.kind} adı`}
                            className="flex-1 px-2.5 py-2 text-sm border border-border rounded bg-background" />
                        )}
                        <button type="button" onClick={() => removeAssignTarget(a.id)}
                          className="p-2 rounded hover:bg-destructive/10 text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== STEP 4: YEKUN ===== */}
          {step === 4 && (
            <div className="space-y-4">
              <SummarySection title="Əsas Məlumatlar">
                <SummaryRow label="KPI adı" value={draft.name} />
                <SummaryRow label="Təyinat növü" value={draft.mode === "individual" ? "Fərdi" : "Toplu"} />
                <SummaryRow label="Dövr" value={draft.frequency} />
                <SummaryRow label="Müddət" value={`${draft.startDate} → ${draft.endDate}`} />
                <SummaryRow label="Bal sistemi" value={draft.scoringSystem} />
                <SummaryRow label="Təsdiq matrisi" value={draft.useMatrix ? "Bəli" : "Xeyr"} />
              </SummarySection>

              <SummarySection title="Lifecycle">
                <SummaryRow label="Assignment Deadline" value={draft.lifecycle.assignmentDeadline} />
                <SummaryRow label="Qiymətləndirmə" value={`${draft.lifecycle.evaluationStart} → ${draft.lifecycle.evaluationEnd}`} />
                <SummaryRow label="Review sayı" value={`${draft.lifecycle.reviews.length}`} />
              </SummarySection>

              <SummarySection title={`Hədəflər (${draft.targets.length} · ${totalWeight}%)`}>
                {draft.targets.length === 0
                  ? <div className="text-xs text-muted-foreground italic">Hədəf yoxdur</div>
                  : draft.targets.map((t, i) => (
                    <div key={t.id} className="text-xs flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                      <span className="font-medium text-foreground">#{i + 1} {t.name}</span>
                      <span className="text-muted-foreground">{t.type} · {t.weight}%{t.cascading ? ` · cascade (${t.cascadeMatrix})` : ""}</span>
                    </div>
                  ))
                }
              </SummarySection>

              <SummarySection title="Təyinatlar">
                <SummaryRow label="Yaradan" value={draft.createdBy === "self" ? "Özüm" : draft.createdByEmployee || "—"} />
                <SummaryRow label="Qiymətləndirici" value={draft.evaluators.map(e => `${e.name}${draft.evaluators.length > 1 ? ` (${e.weight}%)` : ""}`).join(", ") || "—"} />
                <SummaryRow label="Təyinat" value={draft.assignTargets.map(a => `${a.kind}: ${a.value}`).join(", ") || "—"} />
              </SummarySection>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-4 border-t border-border mt-4">
          <button type="button" onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}
            className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg border border-border bg-card text-foreground disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
          <div className="text-xs text-muted-foreground">{step} / {TOTAL_STEPS}</div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button type="button" onClick={close} className="px-4 py-2 text-sm rounded-lg border border-border bg-card">Ləğv et</button>
            {step < TOTAL_STEPS ? (
              <button type="button" onClick={handleNext} disabled={!canNext}
                className="flex items-center gap-1 px-5 py-2 text-sm rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium disabled:opacity-50">
                Növbəti <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button type="button" onClick={() => finalize("draft")}
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-secondary">
                  <Save className="w-4 h-4" /> Qaralama kimi saxla
                </button>
                <button type="button" onClick={() => finalize("create")}
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium">
                  KPI yarat
                </button>
                <button type="button" onClick={() => finalize("create_active")}
                  className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium">
                  <Power className="w-4 h-4" /> KPI yarat və aktiv et
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value || "—"}</span>
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20">
      <div className="px-3 py-2 bg-secondary/40 text-xs font-semibold text-foreground border-b border-border">{title}</div>
      <div className="p-3 space-y-1">{children}</div>
    </div>
  );
}

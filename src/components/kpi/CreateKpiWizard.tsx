import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCatalogValues } from "@/lib/dropdownCatalogStore";
import { getEmployees } from "@/lib/orgStore";
import { getStructures, type OrgStructure } from "@/lib/orgStore";
import { getTeams, addTeam } from "@/lib/teamsStore";
import { useCascadeMatrices } from "@/lib/cascadeMatrixStore";
import { getApprovalMatrices } from "@/lib/matrixStore";
import {
  ChevronLeft, ChevronRight, Sparkles, CalendarDays, Users, User,
  ShieldCheck, Target as TargetIcon, Trash2, Plus, GitBranch, UserPlus,
  ClipboardList, Save, Power, Send, Star, Search, X, Check, ChevronDown,
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

/** Types that DO NOT allow range definitions — only score+description rows. */
const SCORE_DESC_TYPES: HedefType[] = ["İcra", "Fərdi İnkişaf", "Zaman"];

export interface WizardScoreDesc {
  id: string;
  score: number;
  description: string;
  timeStart?: string;
  timeEnd?: string;
}

export interface WizardEvaluatorRef { id: string; name: string; weight: number }

export type TargetCreatedBy = "self" | "other";

export interface WizardHedef {
  id: string;
  name: string;
  type: HedefType;
  weight: number;
  scoreLimit: number;

  /** Bu hədəfi kim təyin edir */
  createdBy: TargetCreatedBy;

  /** Birdən çox qiymətləndirici (faiz bölgüsü ilə) */
  evaluators: WizardEvaluatorRef[];
  /** Təyin edici (digər əməkdaş seçildikdə) */
  assigner: string;

  /** Back-compat: tək qiymətləndirici adı (1-ci evaluator-un adı) */
  evaluator: string;

  // Type-specific eval
  min: string;
  max: string;
  currency: "AZN" | "USD" | "EUR";
  ranges?: { id: string; min: string; max: string; score: string; weight: string }[];
  competencyMatrix: string;
  freeInput: string;
  booleanYes: number;
  booleanNo: number;
  timeStart: string;
  timeEnd: string;

  /** Score-description rows for İcra/Fərdi İnkişaf/Zaman və qiymət popup-u */
  scoreDescriptions?: WizardScoreDesc[];

  cascading: boolean;
  cascadeMatrix: string;
}

export type AssigneeKind = "Şəxs" | "Komanda" | "Struktur" | "Vəzifə";

export interface WizardAssignTarget { id: string; kind: AssigneeKind; value: string }
export interface WizardEvaluator { id: string; name: string; weight: number }

export type CreatedBy = "self" | "other";

export interface WizardLifecycleReview { id: string; name: string; start: string; end: string }

export type WizardAction = "draft" | "submit" | "create_active";

export interface CreateKpiWizardDraft {
  name: string;
  mode: "individual" | "bulk";
  /** Fərdi mode: çoxlu əməkdaş (multi-select) */
  individualEmployees: string[];
  /** Toplu mode: hər kateqoriya üçün çoxlu seçim */
  bulkSelections: {
    teams: string[];
    structures: string[];
    positions: string[];
    persons: string[];
  };

  frequency: string;
  /** Rüblük: il və rüb */
  quarterYear: number;
  quarter: 1 | 2 | 3 | 4;
  startDate: string;
  endDate: string;

  scoringSystem: string;
  useMatrix: boolean;
  approvalMatrixId: string;

  lifecycle: {
    /** KPI təyin olunması */
    assignmentStart: string;
    assignmentEnd: string;
    /** Köhnə fieldin saxlanması üçün back-compat */
    assignmentDeadline: string;
    /** KPI qiymətləndirilməsi */
    evaluationStart: string;
    evaluationEnd: string;
    /** Bonusun hesablanması */
    bonusStart: string;
    bonusEnd: string;
    reviews: WizardLifecycleReview[];
  };

  targets: WizardHedef[];

  // back-compat
  createdBy: CreatedBy;
  createdByEmployee: string;
  evaluators: WizardEvaluator[];
  assignTargets: WizardAssignTarget[];

  action?: WizardAction;
  lastStep?: number;
}

export const emptyKpiWizardDraft = (): CreateKpiWizardDraft => ({
  name: "",
  mode: "individual",
  individualEmployees: [],
  bulkSelections: { teams: [], structures: [], positions: [], persons: [] },
  frequency: "Aylıq",
  quarterYear: new Date().getFullYear(),
  quarter: 1,
  startDate: "",
  endDate: "",
  scoringSystem: "1-5",
  useMatrix: false,
  approvalMatrixId: "",
  lifecycle: {
    assignmentStart: "",
    assignmentEnd: "",
    assignmentDeadline: "",
    evaluationStart: "",
    evaluationEnd: "",
    bonusStart: "",
    bonusEnd: "",
    reviews: [],
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
  createdBy: "self",
  evaluators: [],
  evaluator: "",
  assigner: "",
  min: "",
  max: "",
  currency: "AZN",
  ranges: [{ id: crypto.randomUUID(), min: "", max: "", score: "", weight: "" }],
  competencyMatrix: "",
  freeInput: "",
  booleanYes: 5,
  booleanNo: 2,
  timeStart: "",
  timeEnd: "",
  scoreDescriptions: [],
  cascading: false,
  cascadeMatrix: "",
});

const STEPS = [
  { n: 1, title: "Əsas məlumatlar", sub: "KPI adı, dövr, tarixlər və lifecycle", icon: Sparkles },
  { n: 2, title: "Hədəflər", sub: "Hədəf növləri, çəkilər, qiymətləndirici və təyin edici", icon: TargetIcon },
  { n: 3, title: "Yekun və təsdiq", sub: "Bütün məlumatları nəzərdən keçirin və yadda saxlayın", icon: ClipboardList },
];
const TOTAL_STEPS = STEPS.length;

const PERIODS = ["Aylıq", "Rüblük", "6 Aylıq", "İllik", "Custom"];
const SCORING = ["1-5", "1-10", "Digər"];
const CURRENCIES: WizardHedef["currency"][] = ["AZN", "USD", "EUR"];

// ============ DATE HELPERS ============
const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const addMonths = (iso: string, months: number): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const target = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  return toISO(target);
};
const quarterRange = (year: number, q: 1 | 2 | 3 | 4): [string, string] => {
  const startMonth = (q - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return [toISO(start), toISO(end)];
};

// ============ MULTI-SELECT (search) ============
function MultiSelectDropdown({
  options, selected, onChange, placeholder, ariaLabel, disabled,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options;
    return options.filter(o => o.label.toLowerCase().includes(s));
  }, [q, options]);
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className="w-full min-h-[36px] px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected.length ? "text-foreground" : "text-muted-foreground"}>
          {selected.length ? `${selected.length} seçildi` : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg">
          <div className="p-1.5 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus value={q} onChange={e => setQ(e.target.value)}
                placeholder="Axtar..."
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-border rounded bg-background"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground text-center">Nəticə yoxdur</div>
            ) : filtered.map(o => {
              const sel = selected.includes(o.value);
              return (
                <button key={o.value} type="button"
                  onClick={() => toggle(o.value)}
                  className={`w-full px-2.5 py-1.5 text-xs text-left flex items-center justify-between hover:bg-secondary ${sel ? "bg-primary/5" : ""}`}>
                  <span className="truncate">{o.label}</span>
                  {sel && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-2 py-1 border-t border-border">
            <span className="text-[11px] text-muted-foreground">{selected.length} seçildi</span>
            <div className="flex gap-1">
              {selected.length > 0 && (
                <button type="button" onClick={() => onChange([])}
                  className="text-[11px] text-destructive hover:underline px-1">Təmizlə</button>
              )}
              <button type="button" onClick={() => setOpen(false)}
                className="text-[11px] text-primary hover:underline px-1">Bağla</button>
            </div>
          </div>
        </div>
      )}
      {selected.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selected.map(v => {
            const o = options.find(x => x.value === v);
            return (
              <span key={v} className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] bg-primary/10 text-primary rounded">
                {o?.label || v}
                <X className="w-3 h-3 cursor-pointer" onClick={() => toggle(v)} />
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Recursive helpers for org tree
const flattenStructures = (nodes: OrgStructure[], parent = ""): { id: string; label: string }[] => {
  const out: { id: string; label: string }[] = [];
  for (const n of nodes) {
    const label = parent ? `${parent} › ${n.name}` : n.name;
    out.push({ id: String(n.id), label });
    if (n.children?.length) out.push(...flattenStructures(n.children, label));
  }
  return out;
};
const flattenPositions = (nodes: OrgStructure[]): { id: string; label: string }[] => {
  const out: { id: string; label: string }[] = [];
  for (const n of nodes) {
    for (const p of n.positions || []) out.push({ id: String(p.id), label: `${p.name} (${n.name})` });
    if (n.children?.length) out.push(...flattenPositions(n.children));
  }
  return out;
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<CreateKpiWizardDraft>;
  onComplete: (draft: CreateKpiWizardDraft) => void;
}

export default function CreateKpiWizard({ open, onOpenChange, initial, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<CreateKpiWizardDraft>(() => ({ ...emptyKpiWizardDraft(), ...(initial || {}) }));

  useEffect(() => {
    if (open) {
      const seeded = { ...emptyKpiWizardDraft(), ...(initial || {}) };
      // ensure nested defaults
      seeded.lifecycle = { ...emptyKpiWizardDraft().lifecycle, ...(initial as any)?.lifecycle };
      seeded.bulkSelections = { ...emptyKpiWizardDraft().bulkSelections, ...(initial as any)?.bulkSelections };
      setDraft(seeded);
      const resumeStep = (initial as any)?.lastStep;
      setStep(typeof resumeStep === "number" && resumeStep >= 1 && resumeStep <= TOTAL_STEPS ? resumeStep : 1);
    }
  }, [open, initial]);

  const scoringExtra = useCatalogValues("scoring_systems", ["1-3 Bal", "Faiz (0-100)"]);
  const cascadeMatrices = useCascadeMatrices();

  // ===== Reference data =====
  const activeEmployees = useMemo(
    () => getEmployees().filter(e => e.active).map(e => ({
      id: String(e.id),
      value: `${e.firstName} ${e.lastName}${e.positionName ? " — " + e.positionName : ""}`,
      label: `${e.firstName} ${e.lastName}${e.positionName ? " — " + e.positionName : ""}`,
    })),
    [open],
  );
  const employeeOptions = activeEmployees.map(e => ({ value: e.value, label: e.label }));

  const teamOptions = useMemo(
    () => getTeams().map(t => ({ value: t.name, label: `${t.name} (${t.leader})` })),
    [open],
  );
  const structureTree = useMemo(() => getStructures(), [open]);
  const structureOptions = useMemo(() => flattenStructures(structureTree).map(s => ({ value: s.id, label: s.label })), [structureTree]);
  const positionOptions = useMemo(() => flattenPositions(structureTree).map(p => ({ value: p.id, label: p.label })), [structureTree]);

  const update = (patch: Partial<CreateKpiWizardDraft>) => setDraft(p => ({ ...p, ...patch }));
  const updLifecycle = (patch: Partial<CreateKpiWizardDraft["lifecycle"]>) =>
    setDraft(p => ({ ...p, lifecycle: { ...p.lifecycle, ...patch } }));

  // ===== Frequency-driven date auto-fill =====
  const setFrequency = (f: string) => {
    setDraft(p => {
      const next = { ...p, frequency: f };
      if (f === "Aylıq" && p.startDate) next.endDate = addMonths(p.startDate, 1);
      else if (f === "6 Aylıq" && p.startDate) next.endDate = addMonths(p.startDate, 6);
      else if (f === "İllik" && p.startDate) next.endDate = addMonths(p.startDate, 12);
      else if (f === "Rüblük") {
        const [s, e] = quarterRange(p.quarterYear, p.quarter);
        next.startDate = s; next.endDate = e;
      }
      return next;
    });
  };
  const setStartDate = (s: string) => {
    setDraft(p => {
      const next: CreateKpiWizardDraft = { ...p, startDate: s };
      if (p.frequency === "Aylıq") next.endDate = addMonths(s, 1);
      else if (p.frequency === "6 Aylıq") next.endDate = addMonths(s, 6);
      else if (p.frequency === "İllik") next.endDate = addMonths(s, 12);
      return next;
    });
  };
  const setQuarter = (year: number, q: 1 | 2 | 3 | 4) => {
    const [s, e] = quarterRange(year, q);
    setDraft(p => ({ ...p, quarterYear: year, quarter: q, startDate: s, endDate: e }));
  };

  // ===== Targets =====
  const updHedef = (id: string, patch: Partial<WizardHedef>) =>
    setDraft(p => ({ ...p, targets: p.targets.map(t => t.id === id ? { ...t, ...patch } : t) }));
  const addHedef = () => setDraft(p => ({ ...p, targets: [...p.targets, emptyHedef()] }));
  const removeHedef = (id: string) => setDraft(p => ({ ...p, targets: p.targets.filter(t => t.id !== id) }));
  const totalWeight = useMemo(() => draft.targets.reduce((s, t) => s + (Number(t.weight) || 0), 0), [draft.targets]);

  const applyEvaluatorsToAll = (evs: WizardEvaluatorRef[]) =>
    setDraft(p => ({
      ...p,
      targets: p.targets.map(t => ({ ...t, evaluators: evs.map(e => ({ ...e, id: crypto.randomUUID() })), evaluator: evs[0]?.name || "" })),
    }));
  const applyAssignerToAll = (name: string) =>
    setDraft(p => ({ ...p, targets: p.targets.map(t => ({ ...t, assigner: name, createdBy: name ? "other" : t.createdBy })) }));

  // Reviews
  const addReview = () => updLifecycle({
    reviews: [...draft.lifecycle.reviews, { id: crypto.randomUUID(), name: `Review ${draft.lifecycle.reviews.length + 1}`, start: "", end: "" }],
  });
  const updReview = (id: string, patch: Partial<WizardLifecycleReview>) =>
    updLifecycle({ reviews: draft.lifecycle.reviews.map(r => r.id === id ? { ...r, ...patch } : r) });
  const removeReview = (id: string) =>
    updLifecycle({ reviews: draft.lifecycle.reviews.filter(r => r.id !== id) });

  // Scoring system upper bound
  const scoreMax = useMemo<number | undefined>(() => {
    const s = (draft.scoringSystem || "").toLowerCase();
    const m = s.match(/(\d+)\s*-\s*(\d+)/);
    if (m) return Number(m[2]);
    if (s.includes("faiz")) return 100;
    return undefined;
  }, [draft.scoringSystem]);

  // Validation per target — for "Save draft" we don't strictly require everything
  const validateHedef = (t: WizardHedef): string | null => {
    if (!t.name.trim()) return "Hədəf adı boşdur";
    if (!t.weight || t.weight <= 0) return "Hədəf çəkisi 0-dan böyük olmalıdır";
    if (t.createdBy === "other") {
      if (!t.assigner) return `"${t.name}" üçün Təyin edici seçilməlidir`;
      if (t.evaluators.length === 0) return `"${t.name}" üçün ən az 1 Qiymətləndirici seçin`;
      const sum = t.evaluators.reduce((s, e) => s + (Number(e.weight) || 0), 0);
      if (t.evaluators.length > 1 && sum !== 100) return `"${t.name}": qiymətləndiricilərin faiz cəmi 100% olmalıdır (hazırda ${sum}%)`;
      return null; // other fields are filled by the assigner later
    }
    if (!t.scoreLimit || t.scoreLimit <= 0) return "Qiymətləndirmə balı daxil edilməlidir";
    if (scoreMax !== undefined && t.scoreLimit > scoreMax) {
      return `Qiymət. balı ${scoreMax}-dən böyük ola bilməz`;
    }
    if (["Məbləğ", "Say", "Faiz", "Nisbət"].includes(t.type)) {
      const rs = t.ranges && t.ranges.length > 0 ? t.ranges : [{ id: "x", min: t.min, max: t.max, score: String(t.scoreLimit ?? ""), weight: "" }];
      for (let i = 0; i < rs.length; i++) {
        const r = rs[i];
        if (r.min === "" || r.max === "" || r.score === "") return `${t.type}: Aralıq #${i + 1} — Min, Max və Bal tələb olunur`;
        if (Number(r.min) > Number(r.max)) return `${t.type}: Aralıq #${i + 1} — Min Max-dan kiçik olmalıdır`;
        if (scoreMax !== undefined && Number(r.score) > scoreMax) return `${t.type}: Aralıq #${i + 1} — Bal ${scoreMax}-dən böyük ola bilməz`;
      }
    }
    if (t.type === "Səriştə" && !t.competencyMatrix) return "Səriştə: Competency Matrix seçilməlidir";
    if (SCORE_DESC_TYPES.includes(t.type)) {
      const required = scoreMax === 10 ? [10, 4] : [5, 2];
      const sd = t.scoreDescriptions || [];
      for (const r of required) {
        const row = sd.find(x => Number(x.score) === r);
        if (!row || !row.description.trim()) return `${t.type}: ${r} balın izahı məcburidir`;
        if (t.type === "Zaman" && (!row.timeStart || !row.timeEnd)) return `Zaman: ${r} balı üçün zaman aralığı tələb olunur`;
      }
    }
    if (t.evaluators.length > 1) {
      const sum = t.evaluators.reduce((s, e) => s + (Number(e.weight) || 0), 0);
      if (sum !== 100) return `"${t.name}": qiymətləndiricilərin faiz cəmi 100% olmalıdır (hazırda ${sum}%)`;
    }
    return null;
  };

  // Step gate (for "Növbəti")
  const canNext = useMemo(() => {
    switch (step) {
      case 1: {
        const lc = draft.lifecycle;
        const lifecycleOk = !!lc.assignmentStart && !!lc.assignmentEnd
          && !!lc.evaluationStart && !!lc.evaluationEnd
          && !!lc.bonusStart && !!lc.bonusEnd;
        return !!draft.name.trim() && !!draft.frequency && !!draft.startDate && !!draft.endDate
          && draft.endDate >= draft.startDate && !!draft.scoringSystem && lifecycleOk;
      }
      case 2:
        return draft.targets.length > 0 && totalWeight === 100
          && draft.targets.every(t => validateHedef(t) === null);
      case 3: return true;
      default: return false;
    }
  }, [step, draft, totalWeight, scoreMax]);

  const close = () => {
    onOpenChange(false);
    setTimeout(() => { setStep(1); setDraft({ ...emptyKpiWizardDraft(), ...(initial || {}) }); }, 200);
  };

  const handleNext = () => {
    if (!canNext) {
      if (step === 1) toast.error("Bütün tələb olunan sahələri (lifecycle tarixləri daxil) doldurun");
      else if (step === 2) {
        const first = draft.targets.map(validateHedef).find(Boolean);
        if (first) toast.error(first);
        else if (totalWeight !== 100) toast.error(`Hədəf çəkilərinin cəmi 100% olmalıdır (hazırda ${totalWeight}%)`);
        else toast.error("Ən az bir hədəf əlavə edin");
      }
      return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  /** Auto-create a team if Toplu+Şəxs has 2+ people. */
  const ensureAutoTeam = (d: CreateKpiWizardDraft) => {
    if (d.mode !== "bulk") return;
    const persons = d.bulkSelections.persons;
    if (persons.length < 2) return;
    const baseName = `${d.name || "KPI"} — Komandası`;
    const teams = getTeams();
    if (teams.some(t => t.name === baseName)) return;
    const newId = Math.max(0, ...teams.map(t => t.id)) + 1;
    const leader = persons[0];
    addTeam({
      id: newId,
      name: baseName,
      leader,
      leaderAvatar: leader.charAt(0).toUpperCase(),
      kpiResult: 0,
      branch: "Auto-generated",
      activeKpi: 0, completedKpi: 0, totalKpi: 1,
      members: persons.map(p => ({ name: p, role: "Üzv", kpiScore: 0, avatar: p.charAt(0).toUpperCase() })),
    });
    toast.success(`Yeni komanda yaradıldı: ${baseName}`);
  };

  const finalize = (action: WizardAction) => {
    if (action === "submit" && draft.useMatrix && !draft.approvalMatrixId) {
      toast.error("Təyinə göndərmək üçün təsdiqləmə matrisini seçin");
      return;
    }
    ensureAutoTeam(draft);
    onComplete({ ...draft, action, lastStep: step });
    toast.success(
      action === "draft" ? "Qaralama (Draft) kimi yadda saxlanıldı"
      : action === "create_active" ? "KPI yaradıldı və aktiv edildi"
      : "KPI təyinə göndərildi",
    );
    close();
  };

  // ====== UI ======
  const Field = ({ label, required, children, span = "col-span-12 md:col-span-6" }:
    { label: string; required?: boolean; children: React.ReactNode; span?: string }) => (
    <div className={span}>
      <label className="text-sm font-medium text-foreground">{label}{required && <span className="text-destructive"> *</span>}</label>
      <div className="mt-1">{children}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); else onOpenChange(true); }}>
      <DialogContent className="max-w-4xl w-[92vw] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Yeni KPI — Addım {step}/{TOTAL_STEPS}: {STEPS[step - 1].title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{STEPS[step - 1].sub}</p>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex gap-2 mb-3 mt-1">
          {STEPS.map(s => (
            <div key={s.n} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${s.n < step ? "bg-primary" : s.n === step ? "bg-primary/80" : "bg-muted"}`} />
              <div className={`text-[11px] mt-1 ${s.n === step ? "text-primary font-medium" : "text-muted-foreground"}`}>{s.n}. {s.title}</div>
            </div>
          ))}
        </div>

        <div className="min-h-[280px]">
          {/* ===== STEP 1 ===== */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3">
                <Field label="KPI adı" required span="col-span-12">
                  <input autoFocus value={draft.name} onChange={e => update({ name: e.target.value })}
                    placeholder="Məsələn: Aylıq Satış Hədəfi 2026"
                    className="w-full px-3.5 py-2 text-base border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/40 outline-none" />
                </Field>

                <Field label="KPI təyinat növü" required span="col-span-12">
                  <div className="grid grid-cols-2 gap-2 max-w-md">
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

                {/* INDIVIDUAL: only employee multi-select */}
                {draft.mode === "individual" && (
                  <Field label="Əməkdaş seçimi" required span="col-span-12">
                    <MultiSelectDropdown
                      options={employeeOptions}
                      selected={draft.individualEmployees}
                      onChange={(v) => update({ individualEmployees: v })}
                      placeholder="Əməkdaş axtarın və seçin..."
                    />
                  </Field>
                )}

                {/* BULK: only ONE category at a time */}
                {draft.mode === "bulk" && (() => {
                  const bs = draft.bulkSelections;
                  const activeCat: "teams" | "structures" | "positions" | "persons" | null =
                    bs.teams.length > 0 ? "teams"
                    : bs.structures.length > 0 ? "structures"
                    : bs.positions.length > 0 ? "positions"
                    : bs.persons.length > 0 ? "persons"
                    : null;
                  const dis = (c: typeof activeCat) => activeCat !== null && activeCat !== c;
                  return (
                    <Field label="Toplu təyinat (yalnız birini doldurun)" required span="col-span-12">
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-12 md:col-span-3">
                          <label className="text-[11px] text-muted-foreground">Komanda</label>
                          <MultiSelectDropdown options={teamOptions} selected={bs.teams} disabled={dis("teams")}
                            onChange={(v) => update({ bulkSelections: { ...bs, teams: v } })}
                            placeholder="Komanda seçin" />
                        </div>
                        <div className="col-span-12 md:col-span-3">
                          <label className="text-[11px] text-muted-foreground">Struktur</label>
                          <MultiSelectDropdown options={structureOptions} selected={bs.structures} disabled={dis("structures")}
                            onChange={(v) => update({ bulkSelections: { ...bs, structures: v } })}
                            placeholder="Struktur seçin" />
                        </div>
                        <div className="col-span-12 md:col-span-3">
                          <label className="text-[11px] text-muted-foreground">Vəzifə</label>
                          <MultiSelectDropdown options={positionOptions} selected={bs.positions} disabled={dis("positions")}
                            onChange={(v) => update({ bulkSelections: { ...bs, positions: v } })}
                            placeholder="Vəzifə seçin" />
                        </div>
                        <div className="col-span-12 md:col-span-3">
                          <label className="text-[11px] text-muted-foreground">Şəxs</label>
                          <MultiSelectDropdown options={employeeOptions} selected={bs.persons} disabled={dis("persons")}
                            onChange={(v) => update({ bulkSelections: { ...bs, persons: v } })}
                            placeholder="Şəxs seçin" />
                        </div>
                      </div>
                      {activeCat && (
                        <p className="text-[11px] text-muted-foreground mt-1.5">
                          Yalnız bir kateqoriya seçə bilərsiniz. Dəyişmək üçün cari seçimi təmizləyin.
                        </p>
                      )}
                      {bs.persons.length >= 2 && (
                        <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                          <Users className="w-3 h-3" /> Yadda saxladıqda bu {bs.persons.length} şəxs üçün avtomatik yeni komanda yaradılacaq.
                        </p>
                      )}
                    </Field>
                  );
                })()}

                <Field label="Dövr" required span="col-span-12 md:col-span-4">
                  <select value={draft.frequency} onChange={e => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
                    {PERIODS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>

                {/* Rüblük → il + rüb */}
                {draft.frequency === "Rüblük" ? (
                  <>
                    <Field label="İl" required span="col-span-6 md:col-span-2">
                      <select value={draft.quarterYear} onChange={e => setQuarter(Number(e.target.value), draft.quarter)}
                        className="w-full px-2 py-2 text-sm border border-border rounded-lg bg-background">
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 1).map(y =>
                          <option key={y} value={y}>{y}</option>
                        )}
                      </select>
                    </Field>
                    <Field label="Rüb" required span="col-span-6 md:col-span-2">
                      <select value={draft.quarter} onChange={e => setQuarter(draft.quarterYear, Number(e.target.value) as 1 | 2 | 3 | 4)}
                        className="w-full px-2 py-2 text-sm border border-border rounded-lg bg-background">
                        <option value={1}>I rüb</option>
                        <option value={2}>II rüb</option>
                        <option value={3}>III rüb</option>
                        <option value={4}>IV rüb</option>
                      </select>
                    </Field>
                  </>
                ) : (
                  <Field label="Başlama tarixi" required span="col-span-6 md:col-span-3">
                    <input type="date" value={draft.startDate} onChange={e => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background" />
                  </Field>
                )}

                <Field label="Bitmə tarixi" required span="col-span-6 md:col-span-3">
                  <input
                    type="date"
                    value={draft.endDate}
                    onChange={e => update({ endDate: e.target.value })}
                    disabled={draft.frequency !== "Custom"}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background disabled:opacity-70" />
                  {draft.frequency !== "Custom" && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">Dövrə əsasən avtomatik hesablanır</p>
                  )}
                </Field>

                <Field label="Qiymətləndirmə bal sistemi" required span="col-span-12 md:col-span-4">
                  <select value={draft.scoringSystem} onChange={e => update({ scoringSystem: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background">
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

              {/* ===== Lifecycle ===== */}
              <div className="rounded-lg border border-border bg-card/40 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">KPI Lifecycle</h3>
                </div>

                <LifecycleStage title="KPI təyin olunması *"
                  start={draft.lifecycle.assignmentStart} end={draft.lifecycle.assignmentEnd}
                  onStart={v => updLifecycle({ assignmentStart: v, assignmentDeadline: v })}
                  onEnd={v => updLifecycle({ assignmentEnd: v })} />
                <LifecycleStage title="KPI qiymətləndirilməsi *"
                  start={draft.lifecycle.evaluationStart} end={draft.lifecycle.evaluationEnd}
                  onStart={v => updLifecycle({ evaluationStart: v })}
                  onEnd={v => updLifecycle({ evaluationEnd: v })} />
                <LifecycleStage title="Bonusun hesablanması *"
                  start={draft.lifecycle.bonusStart} end={draft.lifecycle.bonusEnd}
                  onStart={v => updLifecycle({ bonusStart: v })}
                  onEnd={v => updLifecycle({ bonusEnd: v })} />

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
                              className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
                          </div>
                          <div className="col-span-6 md:col-span-3">
                            <label className="text-[11px] text-muted-foreground">Başlama</label>
                            <input type="date" value={r.start} onChange={e => updReview(r.id, { start: e.target.value })}
                              className="w-full mt-0.5 px-2 py-1.5 text-sm border border-border rounded bg-background" />
                          </div>
                          <div className="col-span-6 md:col-span-3">
                            <label className="text-[11px] text-muted-foreground">Bitmə</label>
                            <input type="date" value={r.end} onChange={e => updReview(r.id, { end: e.target.value })}
                              className="w-full mt-0.5 px-2 py-1.5 text-sm border border-border rounded bg-background" />
                          </div>
                          <div className="col-span-12 md:col-span-2">
                            <button type="button" onClick={() => removeReview(r.id)}
                              className="w-full px-2 py-1.5 text-xs rounded border border-border text-destructive hover:bg-destructive/10">
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

          {/* ===== STEP 2 ===== */}
          {step === 2 && (
            <Step2Targets
              draft={draft}
              employeeOptions={employeeOptions}
              cascadeMatrices={cascadeMatrices}
              scoreMax={scoreMax}
              totalWeight={totalWeight}
              update={update}
              updHedef={updHedef}
              addHedef={addHedef}
              removeHedef={removeHedef}
              applyEvaluatorsToAll={applyEvaluatorsToAll}
              applyAssignerToAll={applyAssignerToAll}
            />
          )}

          {/* ===== STEP 3 ===== */}
          {step === 3 && (() => {
            const approvalMatrices = getApprovalMatrices();
            const selectedMatrix = approvalMatrices.find(m => m.id === draft.approvalMatrixId);
            return (
              <div className="space-y-3">
                <SummarySection title="Əsas Məlumatlar">
                  <SummaryRow label="KPI adı" value={draft.name} />
                  <SummaryRow label="Təyinat növü" value={draft.mode === "individual" ? "Fərdi" : "Toplu"} />
                  <SummaryRow label="Dövr" value={draft.frequency} />
                  <SummaryRow label="Müddət" value={`${draft.startDate} → ${draft.endDate}`} />
                  <SummaryRow label="Bal sistemi" value={draft.scoringSystem} />
                  <SummaryRow label="Təsdiqləmə matrisi" value={draft.useMatrix ? "Bəli" : "Xeyr"} />
                  {draft.mode === "individual" && <SummaryRow label="Əməkdaşlar" value={draft.individualEmployees.join(", ") || "—"} />}
                  {draft.mode === "bulk" && (
                    <>
                      {draft.bulkSelections.teams.length > 0 && <SummaryRow label="Komandalar" value={draft.bulkSelections.teams.join(", ")} />}
                      {draft.bulkSelections.structures.length > 0 && <SummaryRow label="Strukturlar" value={`${draft.bulkSelections.structures.length} seçim`} />}
                      {draft.bulkSelections.positions.length > 0 && <SummaryRow label="Vəzifələr" value={`${draft.bulkSelections.positions.length} seçim`} />}
                      {draft.bulkSelections.persons.length > 0 && <SummaryRow label="Şəxslər" value={draft.bulkSelections.persons.join(", ")} />}
                    </>
                  )}
                </SummarySection>

                <SummarySection title="Lifecycle">
                  <SummaryRow label="KPI təyin olunması" value={`${draft.lifecycle.assignmentStart || "—"} → ${draft.lifecycle.assignmentEnd || "—"}`} />
                  <SummaryRow label="Qiymətləndirmə" value={`${draft.lifecycle.evaluationStart || "—"} → ${draft.lifecycle.evaluationEnd || "—"}`} />
                  <SummaryRow label="Bonus hesablanması" value={`${draft.lifecycle.bonusStart || "—"} → ${draft.lifecycle.bonusEnd || "—"}`} />
                  <SummaryRow label="Review sayı" value={`${draft.lifecycle.reviews.length}`} />
                </SummarySection>

                <SummarySection title={`Hədəflər (${draft.targets.length} · ${totalWeight}%)`}>
                  {draft.targets.length === 0
                    ? <div className="text-xs text-muted-foreground italic">Hədəf yoxdur</div>
                    : draft.targets.map((t, i) => (
                      <div key={t.id} className="text-xs py-1 border-b border-border/50 last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">#{i + 1} {t.name}</span>
                          <span className="text-muted-foreground">{t.type} · {t.weight}%{t.cascading ? ` · cascade (${t.cascadeMatrix})` : ""}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          Qiymətləndiricilər: <span className="text-foreground">{t.evaluators.map(e => `${e.name}${t.evaluators.length > 1 ? ` (${e.weight}%)` : ""}`).join(", ") || "—"}</span>
                          {" · "}Təyin edən: <span className="text-foreground">{t.createdBy === "self" ? "Özüm" : (t.assigner || "—")}</span>
                        </div>
                      </div>
                    ))
                  }
                </SummarySection>

                {draft.useMatrix && (
                  <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Təsdiqləmə Matrisi seçimi</h3>
                    </div>
                    <select value={draft.approvalMatrixId}
                      onChange={e => update({ approvalMatrixId: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm border border-border rounded bg-background">
                      <option value="">— Təsdiqləmə matrisi seçin —</option>
                      {approvalMatrices.map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.steps.length} addım)</option>
                      ))}
                    </select>
                    {selectedMatrix && (
                      <div className="text-[11px] text-muted-foreground">
                        Addımlar: {selectedMatrix.steps.map(s => s.label).join(" → ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border mt-3">
          <button type="button" onClick={() => step > 1 && setStep(step - 1)} disabled={step === 1}
            className="flex items-center gap-1 px-4 py-1.5 text-sm rounded-lg border border-border bg-card text-foreground disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
          <div className="text-xs text-muted-foreground">{step} / {TOTAL_STEPS}</div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button type="button" onClick={close} className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card">Ləğv et</button>
            {/* "Yadda saxla" — bütün addımlarda */}
            <button type="button" onClick={() => finalize("draft")}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary">
              <Save className="w-4 h-4" /> Yadda saxla
            </button>
            {step < TOTAL_STEPS ? (
              <button type="button" onClick={handleNext} disabled={!canNext}
                className="flex items-center gap-1 px-5 py-1.5 text-sm rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium disabled:opacity-50">
                Növbəti <ChevronRight className="w-4 h-4" />
              </button>
            ) : draft.useMatrix ? (
              <button type="button" onClick={() => finalize("submit")}
                className="flex items-center gap-1 px-4 py-1.5 text-sm rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 font-semibold shadow-sm hover:from-amber-500 hover:to-yellow-600">
                <Send className="w-4 h-4" /> Təyinə göndər
              </button>
            ) : (
              <button type="button" onClick={() => finalize("create_active")}
                className="flex items-center gap-1 px-4 py-1.5 text-sm rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium">
                <Power className="w-4 h-4" /> KPI yarat
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Lifecycle stage sub-component
// =========================================================
function LifecycleStage({ title, start, end, onStart, onEnd }: {
  title: string; start: string; end: string;
  onStart: (v: string) => void; onEnd: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-12 md:col-span-4">
        <label className="text-xs font-medium text-foreground">{title}</label>
      </div>
      <div className="col-span-6 md:col-span-4">
        <label className="text-[11px] text-muted-foreground">Başlama tarixi</label>
        <input type="date" value={start} onChange={e => onStart(e.target.value)}
          className="w-full mt-0.5 px-2 py-1.5 text-sm border border-border rounded bg-background" />
      </div>
      <div className="col-span-6 md:col-span-4">
        <label className="text-[11px] text-muted-foreground">Bitmə tarixi</label>
        <input type="date" value={end} onChange={e => onEnd(e.target.value)}
          className="w-full mt-0.5 px-2 py-1.5 text-sm border border-border rounded bg-background" />
      </div>
    </div>
  );
}

// =========================================================
// STEP 2 — Targets
// =========================================================
function Step2Targets({
  draft, employeeOptions, cascadeMatrices, scoreMax, totalWeight,
  update, updHedef, addHedef, removeHedef, applyEvaluatorsToAll, applyAssignerToAll,
}: {
  draft: CreateKpiWizardDraft;
  employeeOptions: { value: string; label: string }[];
  cascadeMatrices: { id: string; name: string; scopeType: string }[];
  scoreMax: number | undefined;
  totalWeight: number;
  update: (p: Partial<CreateKpiWizardDraft>) => void;
  updHedef: (id: string, p: Partial<WizardHedef>) => void;
  addHedef: () => void;
  removeHedef: (id: string) => void;
  applyEvaluatorsToAll: (evs: WizardEvaluatorRef[]) => void;
  applyAssignerToAll: (n: string) => void;
}) {
  // Unified picker for "vahid təyinedici / qiymətləndirici"
  const [unifiedAssigner, setUnifiedAssigner] = useState<string>("");
  const [unifiedEvaluators, setUnifiedEvaluators] = useState<WizardEvaluatorRef[]>([]);
  const [scoreDlgFor, setScoreDlgFor] = useState<string | null>(null);

  const scoreDlgTarget = draft.targets.find(t => t.id === scoreDlgFor) || null;

  return (
    <div className="space-y-3">
      {/* Vahid seçim panel */}
      <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2.5">
        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-primary" /> Vahid seçim (bütün hədəflərə tətbiq)
        </div>
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-12 md:col-span-6">
            <label className="text-[11px] text-muted-foreground">Vahid Təyin edici</label>
            <div className="flex gap-1.5 mt-0.5">
              <select value={unifiedAssigner} onChange={e => setUnifiedAssigner(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs border border-border rounded bg-background">
                <option value="">— Seçin —</option>
                {employeeOptions.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
              <button type="button"
                disabled={!unifiedAssigner || draft.targets.length === 0}
                onClick={() => { applyAssignerToAll(unifiedAssigner); toast.success(`Təyin edici ${draft.targets.length} hədəfə tətbiq edildi`); }}
                className="px-2.5 py-1.5 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50">
                Tətbiq et
              </button>
            </div>
          </div>
          <div className="col-span-12 md:col-span-6">
            <label className="text-[11px] text-muted-foreground">Vahid Qiymətləndirici(lər)</label>
            <UnifiedEvaluatorsEditor
              employeeOptions={employeeOptions}
              evaluators={unifiedEvaluators}
              onChange={setUnifiedEvaluators}
            />
            <button type="button"
              disabled={unifiedEvaluators.length === 0 || draft.targets.length === 0}
              onClick={() => {
                const sum = unifiedEvaluators.reduce((s, e) => s + (Number(e.weight) || 0), 0);
                if (unifiedEvaluators.length > 1 && sum !== 100) { toast.error(`Qiymətləndiricilərin faiz cəmi 100% olmalıdır (hazırda ${sum}%)`); return; }
                applyEvaluatorsToAll(unifiedEvaluators);
                toast.success(`Qiymətləndirici(lər) ${draft.targets.length} hədəfə tətbiq edildi`);
              }}
              className="w-full mt-1.5 px-2.5 py-1.5 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50">
              Bütün hədəflərə tətbiq et
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">KPI Hədəfləri</h3>
          <p className="text-xs text-muted-foreground">Ümumi çəki 100% olmalıdır</p>
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
        const isOther = t.createdBy === "other";
        const disabled = isOther; // disable main fields except assigner/evaluators
        const showMinMax = ["Məbləğ", "Say", "Faiz", "Nisbət"].includes(t.type);
        const showCascade = CASCADE_TYPES.includes(t.type);
        const isScoreDescType = SCORE_DESC_TYPES.includes(t.type);

        return (
          <div key={t.id} className="relative p-3.5 rounded-xl border-2 border-primary/30 bg-card/60 space-y-2.5 shadow-sm">
            <button type="button" title="Sil" onClick={() => removeHedef(t.id)}
              className="absolute top-3 right-3 p-1.5 rounded hover:bg-destructive/10 text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 pb-1.5 border-b border-border/60">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-base flex items-center justify-center">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="text-base font-bold text-foreground">Hədəf #{idx + 1}</div>
                <div className="text-xs text-muted-foreground">{t.name || "— Adsız hədəf —"} · {t.type}</div>
              </div>
              {/* Hədəfi kim təyin edir */}
              <div className="flex gap-1.5 mr-8">
                {([
                  { v: "self" as const, t: "Özüm təyin edirəm" },
                  { v: "other" as const, t: "Digər əməkdaş təyin edir" },
                ]).map(o => {
                  const active = t.createdBy === o.v;
                  return (
                    <button key={o.v} type="button"
                      onClick={() => updHedef(t.id, { createdBy: o.v, assigner: o.v === "self" ? "" : t.assigner })}
                      className={`px-2 py-1 rounded border text-[11px] font-medium ${active ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30" : "border-border bg-card hover:border-primary/40"}`}>
                      {o.t}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 md:col-span-5">
                <label className="text-[11px] text-muted-foreground">Hədəf adı *</label>
                <input value={t.name} disabled={disabled} onChange={e => updHedef(t.id, { name: e.target.value })}
                  placeholder="Məsələn: Rüblük satış həcmi"
                  className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background disabled:opacity-60" />
              </div>
              <div className="col-span-12 md:col-span-3">
                <label className="text-[11px] text-muted-foreground">Hədəf növü *</label>
                <select value={t.type} disabled={disabled} onChange={e => updHedef(t.id, { type: e.target.value as HedefType })}
                  className="w-full mt-0.5 px-2 py-1.5 text-sm border border-border rounded bg-background disabled:opacity-60">
                  {HEDEF_TYPES.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="col-span-6 md:col-span-2">
                <label className="text-[11px] text-muted-foreground">Çəki (%) *</label>
                <input type="number" min={0} max={100} value={t.weight} disabled={disabled}
                  onChange={e => updHedef(t.id, { weight: Number(e.target.value) })}
                  className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background disabled:opacity-60" />
              </div>
              <div className="col-span-6 md:col-span-2 flex items-end">
                <button type="button" onClick={() => setScoreDlgFor(t.id)}
                  className="w-full px-2 py-1.5 text-xs font-medium rounded border border-amber-500/60 text-amber-700 hover:bg-amber-500/10 flex items-center justify-center gap-1">
                  <Star className="w-3.5 h-3.5" /> Qiymətlər
                </button>
              </div>
            </div>

            {/* Type-specific eval fields — disabled when "other" */}
            {!disabled && (
              <div className="rounded-md bg-secondary/30 border border-border/60 p-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Qiymətləndirmə — {t.type}</div>

                {showMinMax && !isScoreDescType && (() => {
                  const ranges = t.ranges && t.ranges.length > 0
                    ? t.ranges
                    : [{ id: crypto.randomUUID(), min: t.min, max: t.max, score: String(t.scoreLimit ?? ""), weight: String(t.weight ?? "") }];
                  const setRanges = (rs: NonNullable<WizardHedef["ranges"]>) => updHedef(t.id, { ranges: rs, min: rs[0]?.min || "", max: rs[0]?.max || "" });
                  return (
                    <div className="space-y-1.5">
                      {t.type === "Məbləğ" && (
                        <div className="flex items-center justify-end gap-2">
                          <label className="text-[11px] text-muted-foreground">Valyuta</label>
                          <select value={t.currency} onChange={e => updHedef(t.id, { currency: e.target.value as WizardHedef["currency"] })}
                            className="px-2 py-1 text-xs border border-border rounded bg-background">
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      )}
                      <div className="grid grid-cols-12 gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground px-1">
                        <div className="col-span-3">Min *</div>
                        <div className="col-span-3">Max *</div>
                        <div className="col-span-2">Bal *{scoreMax !== undefined && <span className="normal-case"> (1-{scoreMax})</span>}</div>
                        <div className="col-span-2">Çəki %</div>
                        <div className="col-span-2 text-right">Əməl.</div>
                      </div>
                      {ranges.map((r) => (
                        <div key={r.id} className="grid grid-cols-12 gap-1.5 items-center">
                          <input type="number" value={r.min} placeholder="0"
                            onChange={e => setRanges(ranges.map(x => x.id === r.id ? { ...x, min: e.target.value } : x))}
                            className="col-span-3 px-2 py-1 text-xs border border-border rounded bg-background" />
                          <input type="number" value={r.max} placeholder="0"
                            onChange={e => setRanges(ranges.map(x => x.id === r.id ? { ...x, max: e.target.value } : x))}
                            className="col-span-3 px-2 py-1 text-xs border border-border rounded bg-background" />
                          <input type="number" value={r.score} placeholder="0" min={1} max={scoreMax}
                            onChange={e => {
                              let v = e.target.value;
                              if (scoreMax !== undefined && Number(v) > scoreMax) v = String(scoreMax);
                              setRanges(ranges.map(x => x.id === r.id ? { ...x, score: v } : x));
                            }}
                            className="col-span-2 px-2 py-1 text-xs border border-border rounded bg-background" />
                          <input type="number" value={r.weight} placeholder="0" min={0} max={100}
                            onChange={e => setRanges(ranges.map(x => x.id === r.id ? { ...x, weight: e.target.value } : x))}
                            className="col-span-2 px-2 py-1 text-xs border border-border rounded bg-background" />
                          <div className="col-span-2 flex justify-end">
                            {ranges.length > 1 && (
                              <button type="button" onClick={() => setRanges(ranges.filter(x => x.id !== r.id))}
                                className="p-1 text-destructive hover:bg-destructive/10 rounded" title="Sil">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => setRanges([...ranges, { id: crypto.randomUUID(), min: "", max: "", score: "", weight: "" }])}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-dashed border-primary/50 text-primary hover:bg-primary/10">
                        <Plus className="w-3.5 h-3.5" /> Aralıq əlavə et (Min / Max / Bal / Çəki)
                      </button>
                    </div>
                  );
                })()}

                {isScoreDescType && (
                  <p className="text-[11px] text-muted-foreground italic">
                    Bu növ üçün aralıq əlavə etmək mümkün deyil. <strong>"Qiymətlər"</strong> düyməsinə klik edib yalnız bal və izah daxil edin.
                  </p>
                )}

                {t.type === "Səriştə" && (
                  <select value={t.competencyMatrix} onChange={e => updHedef(t.id, { competencyMatrix: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded bg-background">
                    <option value="">— Competency Matrix seçin —</option>
                    <option value="Liderlik">Liderlik</option>
                    <option value="Texniki Səriştə">Texniki Səriştə</option>
                    <option value="Kommunikasiya">Kommunikasiya</option>
                    <option value="Komanda işi">Komanda işi</option>
                  </select>
                )}

                {t.type === "Boolean" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground">Bəli =</label>
                      <input type="number" value={t.booleanYes} onChange={e => updHedef(t.id, { booleanYes: Number(e.target.value) })}
                        className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Xeyr =</label>
                      <input type="number" value={t.booleanNo} onChange={e => updHedef(t.id, { booleanNo: Number(e.target.value) })}
                        className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Qiymətləndiricilər + Təyin edici */}
            <div className="rounded-md border border-border/60 p-2 bg-background/40 space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Məsuliyyət</div>

              {/* Təyin edici */}
              {isOther && (
                <div>
                  <label className="text-[11px] text-muted-foreground">Təyin edici *</label>
                  <div className="flex gap-1.5 mt-0.5">
                    <select value={t.assigner} onChange={e => updHedef(t.id, { assigner: e.target.value })}
                      className="flex-1 px-2 py-1.5 text-xs border border-border rounded bg-background">
                      <option value="">— Əməkdaş seçin —</option>
                      {employeeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {t.assigner && (
                      <button type="button" onClick={() => updHedef(t.id, { assigner: "" })}
                        className="px-2 py-1.5 text-xs rounded border border-border text-destructive hover:bg-destructive/10">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Qiymətləndiricilər */}
              <div>
                <label className="text-[11px] text-muted-foreground">Qiymətləndirici(lər) {isOther && "*"} {t.evaluators.length > 1 && <span className="text-amber-600">— faiz cəmi 100% olmalıdır</span>}</label>
                <UnifiedEvaluatorsEditor
                  employeeOptions={employeeOptions}
                  evaluators={t.evaluators}
                  onChange={(evs) => updHedef(t.id, { evaluators: evs, evaluator: evs[0]?.name || "" })}
                />
              </div>
            </div>

            {/* Cascade */}
            {showCascade && !disabled && (
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
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded bg-background">
                    <option value="">— Cascade Matrix seçin —</option>
                    {cascadeMatrices.map(m => <option key={m.id} value={m.name}>{m.name} ({m.scopeType})</option>)}
                  </select>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Qiymətlər dialog */}
      {scoreDlgTarget && (
        <ScoresDialog
          target={scoreDlgTarget}
          scoreMax={scoreMax}
          onClose={() => setScoreDlgFor(null)}
          onSave={(rows) => { updHedef(scoreDlgTarget.id, { scoreDescriptions: rows }); setScoreDlgFor(null); }}
        />
      )}
    </div>
  );
}

// =========================================================
// Evaluators multi-editor
// =========================================================
function UnifiedEvaluatorsEditor({ employeeOptions, evaluators, onChange }: {
  employeeOptions: { value: string; label: string }[];
  evaluators: WizardEvaluatorRef[];
  onChange: (e: WizardEvaluatorRef[]) => void;
}) {
  const sum = evaluators.reduce((s, e) => s + (Number(e.weight) || 0), 0);
  const add = () => onChange([...evaluators, { id: crypto.randomUUID(), name: "", weight: evaluators.length === 0 ? 100 : 0 }]);
  return (
    <div className="space-y-1.5">
      {evaluators.map(ev => (
        <div key={ev.id} className="grid grid-cols-12 gap-1.5 items-center">
          <select value={ev.name}
            onChange={e => onChange(evaluators.map(x => x.id === ev.id ? { ...x, name: e.target.value } : x))}
            className="col-span-8 px-2 py-1.5 text-xs border border-border rounded bg-background">
            <option value="">— Əməkdaş seçin —</option>
            {employeeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input type="number" min={0} max={100} value={ev.weight}
            onChange={e => onChange(evaluators.map(x => x.id === ev.id ? { ...x, weight: Number(e.target.value) } : x))}
            placeholder="%"
            className="col-span-3 px-2 py-1.5 text-xs border border-border rounded bg-background" />
          <button type="button" onClick={() => onChange(evaluators.filter(x => x.id !== ev.id))}
            className="col-span-1 p-1 text-destructive hover:bg-destructive/10 rounded" title="Sil">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button type="button" onClick={add}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-dashed border-primary/50 text-primary hover:bg-primary/10">
          <Plus className="w-3 h-3" /> Qiymətləndirici əlavə et
        </button>
        {evaluators.length > 1 && (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${sum === 100 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
            Cəm: {sum}%
          </span>
        )}
      </div>
    </div>
  );
}

// =========================================================
// Scores Dialog
// =========================================================
function ScoresDialog({ target, scoreMax, onClose, onSave }: {
  target: WizardHedef;
  scoreMax: number | undefined;
  onClose: () => void;
  onSave: (rows: WizardScoreDesc[]) => void;
}) {
  const max = scoreMax || 5;
  const isTime = target.type === "Zaman";
  const isScoreDescType = SCORE_DESC_TYPES.includes(target.type);

  const seedRows = useMemo(() => {
    if (target.scoreDescriptions && target.scoreDescriptions.length > 0) return target.scoreDescriptions;
    return Array.from({ length: max }, (_, i) => ({ id: crypto.randomUUID(), score: i + 1, description: "", timeStart: "", timeEnd: "" }));
  }, [target.id, max]);

  const [rows, setRows] = useState<WizardScoreDesc[]>(seedRows);

  useEffect(() => { setRows(seedRows); }, [seedRows]);

  const required = isScoreDescType ? (max === 10 ? [10, 4] : [max, Math.ceil(max * 0.4)]) : [];

  const save = () => {
    for (const r of required) {
      const row = rows.find(x => Number(x.score) === r);
      if (!row || !row.description.trim()) {
        toast.error(`${r} balı üçün izah məcburidir`); return;
      }
      if (isTime && (!row.timeStart || !row.timeEnd)) {
        toast.error(`Zaman: ${r} balı üçün zaman aralığı tələb olunur`); return;
      }
    }
    onSave(rows);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            "{target.name || "Hədəf"}" üçün qiymətlər (1-{max})
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {isScoreDescType ? (
              <>Yalnız bal və izah daxil edilə bilər. <strong>{required.join(" və ")}</strong> ballarının izahı məcburidir; digərləri opsionaldır.</>
            ) : (
              <>Hər balın qısa izahını yaza bilərsiniz (opsional).</>
            )}
          </p>
        </DialogHeader>

        <div className="space-y-2">
          {rows.map((r) => {
            const isReq = required.includes(Number(r.score));
            return (
              <div key={r.id} className={`p-2 rounded border ${isReq ? "border-amber-500/60 bg-amber-500/5" : "border-border"}`}>
                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-2">
                    <label className="text-[11px] text-muted-foreground">Bal</label>
                    <div className="mt-0.5 px-2 py-1.5 text-sm font-bold text-center border border-border rounded bg-background">
                      {r.score}{isReq && <span className="text-destructive ml-0.5">*</span>}
                    </div>
                  </div>
                  <div className={`${isTime ? "col-span-6" : "col-span-10"}`}>
                    <label className="text-[11px] text-muted-foreground">İzah {isReq && "*"}</label>
                    <input value={r.description}
                      onChange={e => setRows(rows.map(x => x.id === r.id ? { ...x, description: e.target.value } : x))}
                      placeholder="Bu balı qazanmaq üçün şərt..."
                      className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
                  </div>
                  {isTime && (
                    <>
                      <div className="col-span-2">
                        <label className="text-[11px] text-muted-foreground">Başlama {isReq && "*"}</label>
                        <input type="date" value={r.timeStart || ""}
                          onChange={e => setRows(rows.map(x => x.id === r.id ? { ...x, timeStart: e.target.value } : x))}
                          className="w-full mt-0.5 px-1 py-1.5 text-xs border border-border rounded bg-background" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[11px] text-muted-foreground">Bitmə {isReq && "*"}</label>
                        <input type="date" value={r.timeEnd || ""}
                          onChange={e => setRows(rows.map(x => x.id === r.id ? { ...x, timeEnd: e.target.value } : x))}
                          className="w-full mt-0.5 px-1 py-1.5 text-xs border border-border rounded bg-background" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg border border-border bg-card">Ləğv et</button>
          <button type="button" onClick={save} className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground flex items-center gap-1">
            <Save className="w-4 h-4" /> Yadda saxla
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================
// Summary helpers
// =========================================================
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
      <div className="px-3 py-1.5 bg-secondary/40 text-xs font-semibold text-foreground border-b border-border">{title}</div>
      <div className="p-3 space-y-1">{children}</div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCatalogValues } from "@/lib/dropdownCatalogStore";
import {
  Check, ChevronLeft, ChevronRight, Sparkles, CalendarDays, Gauge, Users, User,
  ShieldCheck, Repeat, Target as TargetIcon, Trash2, Plus, GitBranch, UserPlus,
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

export interface WizardHedef {
  id: string;
  name: string;
  type: HedefType;
  weight: number;          // % çəkisi
  unit: string;            // AZN, ədəd, %, saat, ...
  targetValue: string;     // hədəf rəqəmi
  formula: string;         // hesablama qaydası (qısa)
  scoringSystem: string;   // override (boş qoyulsa kart default-u tətbiq olunur)
  cascading: boolean;      // cascade tətbiq olunur mu
  evaluator: string;       // qiymətləndirici (ad/vəzifə)
  assigner: string;        // təyin edən
}

export interface WizardAssignment {
  id: string;
  targetId: string;        // hansı hədəf üzrə
  assigneeKind: "Şəxs" | "Komanda" | "Struktur" | "Vəzifə";
  assigneeName: string;
}

export interface CreateKpiWizardDraft {
  name: string;
  frequency: string;
  startDate: string;
  endDate: string;
  scoringSystem: string;
  mode: "individual" | "bulk";
  lifecycle: {
    assignmentDeadline: string;
    reviews: string[];
    evaluationStart: string;
    evaluationEnd: string;
  };
  useMatrix: boolean;
  targets: WizardHedef[];
  assignments: WizardAssignment[];
}

export const emptyKpiWizardDraft = (): CreateKpiWizardDraft => ({
  name: "",
  frequency: "Aylıq",
  startDate: "",
  endDate: "",
  scoringSystem: "1-5 Bal Sistemi",
  mode: "individual",
  lifecycle: {
    assignmentDeadline: "",
    reviews: [],
    evaluationStart: "",
    evaluationEnd: "",
  },
  useMatrix: false,
  targets: [],
  assignments: [],
});

const emptyHedef = (): WizardHedef => ({
  id: crypto.randomUUID(),
  name: "",
  type: "Məbləğ",
  weight: 0,
  unit: "AZN",
  targetValue: "",
  formula: "",
  scoringSystem: "",
  cascading: false,
  evaluator: "",
  assigner: "",
});

const TOTAL_STEPS = 11;

const STEPS: { n: number; title: string; sub: string; icon: any }[] = [
  { n: 1, title: "KPI adı", sub: "KPI üçün başlıq daxil edin", icon: Sparkles },
  { n: 2, title: "Dövrülük", sub: "Hesablama dövrünü seçin", icon: Repeat },
  { n: 3, title: "Başlama tarixi", sub: "KPI nə vaxt başlayır", icon: CalendarDays },
  { n: 4, title: "Bitmə tarixi", sub: "KPI nə vaxt bitir", icon: CalendarDays },
  { n: 5, title: "Bal sistemi", sub: "Default qiymətləndirmə sistemi", icon: Gauge },
  { n: 6, title: "Təyinat növü", sub: "Fərdi yoxsa Toplu KPI", icon: Users },
  { n: 7, title: "Lifecycle", sub: "Deadline / Review / Qiymətləndirmə müddəti", icon: CalendarDays },
  { n: 8, title: "Təsdiq matrisi", sub: "Matris tətbiq olunacaqmı?", icon: ShieldCheck },
  { n: 9, title: "Hədəflər (10-16)", sub: "Hədəf növləri, çəkiləri, cascade və qiymətləndirici", icon: TargetIcon },
  { n: 10, title: "Təyinetmələr (17)", sub: "Hər hədəf üzrə kimlərə təyin edilsin", icon: UserPlus },
  { n: 11, title: "Yekun", sub: "Məlumatları yoxlayın və yaradın", icon: Check },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<CreateKpiWizardDraft>;
  onComplete: (draft: CreateKpiWizardDraft) => void;
}

export default function CreateKpiWizard({ open, onOpenChange, initial, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<CreateKpiWizardDraft>(() => ({ ...emptyKpiWizardDraft(), ...(initial || {}) }));

  const frequencies = useCatalogValues("frequencies", ["Günlük", "Həftəlik", "Aylıq", "Rüblük", "Yarımillik", "İllik"]);
  const scoringSystems = useCatalogValues("scoring_systems", ["1-3 Bal Sistemi", "1-5 Bal Sistemi", "1-10 Bal Sistemi", "Faiz (0-100)"]);

  const update = (patch: Partial<CreateKpiWizardDraft>) => setDraft(p => ({ ...p, ...patch }));
  const updLifecycle = (patch: Partial<CreateKpiWizardDraft["lifecycle"]>) =>
    setDraft(p => ({ ...p, lifecycle: { ...p.lifecycle, ...patch } }));

  // ---- Hədəf helpers ----
  const updHedef = (id: string, patch: Partial<WizardHedef>) =>
    setDraft(p => ({ ...p, targets: p.targets.map(t => t.id === id ? { ...t, ...patch } : t) }));
  const addHedef = () => setDraft(p => ({ ...p, targets: [...p.targets, emptyHedef()] }));
  const removeHedef = (id: string) => setDraft(p => ({
    ...p,
    targets: p.targets.filter(t => t.id !== id),
    assignments: p.assignments.filter(a => a.targetId !== id),
  }));
  const copyHedef = (id: string) => setDraft(p => {
    const src = p.targets.find(t => t.id === id);
    if (!src) return p;
    return { ...p, targets: [...p.targets, { ...src, id: crypto.randomUUID(), name: src.name + " (kopya)" }] };
  });

  const totalWeight = useMemo(() => draft.targets.reduce((s, t) => s + (Number(t.weight) || 0), 0), [draft.targets]);

  // ---- Assignment helpers ----
  const addAssignment = (targetId: string) => setDraft(p => ({
    ...p,
    assignments: [...p.assignments, { id: crypto.randomUUID(), targetId, assigneeKind: "Şəxs", assigneeName: "" }],
  }));
  const updAssignment = (id: string, patch: Partial<WizardAssignment>) =>
    setDraft(p => ({ ...p, assignments: p.assignments.map(a => a.id === id ? { ...a, ...patch } : a) }));
  const removeAssignment = (id: string) =>
    setDraft(p => ({ ...p, assignments: p.assignments.filter(a => a.id !== id) }));

  // Toplu rejimdə yalnız Komanda/Struktur/Vəzifə icazəli
  const allowedKinds = (): WizardAssignment["assigneeKind"][] =>
    draft.mode === "individual"
      ? ["Şəxs", "Komanda", "Struktur", "Vəzifə"]
      : ["Komanda", "Struktur", "Vəzifə"];

  const canNext = useMemo(() => {
    switch (step) {
      case 1: return draft.name.trim().length > 0;
      case 2: return !!draft.frequency;
      case 3: return !!draft.startDate;
      case 4: return !!draft.endDate && (!draft.startDate || draft.endDate >= draft.startDate);
      case 5: return !!draft.scoringSystem;
      case 6: return draft.mode === "individual" || draft.mode === "bulk";
      case 7: return !!draft.lifecycle.assignmentDeadline;
      case 8: return true;
      case 9: return draft.targets.length > 0
        && draft.targets.every(t => t.name.trim() && t.weight > 0)
        && totalWeight === 100;
      case 10: return draft.targets.every(t =>
        draft.assignments.some(a => a.targetId === t.id && a.assigneeName.trim()),
      );
      case 11: return true;
      default: return false;
    }
  }, [step, draft, totalWeight]);

  const close = () => {
    onOpenChange(false);
    setTimeout(() => { setStep(1); setDraft({ ...emptyKpiWizardDraft(), ...(initial || {}) }); }, 200);
  };

  const handleNext = () => {
    if (!canNext) {
      if (step === 9 && totalWeight !== 100) toast.error(`Hədəflərin ümumi çəkisi 100% olmalıdır (hazırda ${totalWeight}%)`);
      else if (step === 10) toast.error("Hər hədəf üçün ən az bir təyinetmə əlavə edin");
      else toast.error("Zəhmət olmasa bu sahəni doldurun");
      return;
    }
    if (step < TOTAL_STEPS) setStep(step + 1);
    else {
      onComplete(draft);
      toast.success("KPI kartı bütün hədəf və təyinetmələrlə yaradıldı");
      close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); else onOpenChange(true); }}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Yeni KPI Yarat — Addım {step}/{TOTAL_STEPS}: {STEPS[step - 1].title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{STEPS[step - 1].sub}</p>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex gap-1.5 mb-4 mt-2">
          {STEPS.map(s => (
            <div
              key={s.n}
              className={`flex-1 h-1.5 rounded-full transition-colors ${s.n < step ? "bg-primary" : s.n === step ? "bg-primary/80" : "bg-muted"}`}
              title={`${s.n}. ${s.title}`}
            />
          ))}
        </div>

        <div className="min-h-[260px]">
          {step === 1 && (
            <div>
              <label className="text-sm font-medium text-foreground">KPI adı *</label>
              <input
                autoFocus
                value={draft.name}
                onChange={e => update({ name: e.target.value })}
                placeholder="Məsələn: Aylıq Satış Hədəfi 2026"
                className="w-full mt-2 px-4 py-3 text-base border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/40 outline-none"
              />
              <p className="text-xs text-muted-foreground mt-2">Bu ad bütün kartlarda, hesabatlarda və bildirişlərdə görünəcək.</p>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Dövrülük növü *</label>
              <div className="grid grid-cols-3 gap-3">
                {frequencies.map(f => {
                  const active = draft.frequency === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => update({ frequency: f })}
                      className={`p-4 rounded-lg border text-sm font-medium transition-all ${active ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30" : "border-border bg-card hover:border-primary/40 text-foreground"}`}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Seçim Sazlamalar → Açılan siyahılar → "Tezlik (Period)" kataloqundan idarə olunur.</p>
            </div>
          )}

          {step === 3 && (
            <div>
              <label className="text-sm font-medium text-foreground">KPI başlama tarixi *</label>
              <input
                type="date"
                value={draft.startDate}
                onChange={e => update({ startDate: e.target.value })}
                className="w-full mt-2 px-4 py-3 text-base border border-border rounded-lg bg-background"
              />
            </div>
          )}

          {step === 4 && (
            <div>
              <label className="text-sm font-medium text-foreground">KPI bitmə tarixi *</label>
              <input
                type="date"
                min={draft.startDate || undefined}
                value={draft.endDate}
                onChange={e => update({ endDate: e.target.value })}
                className="w-full mt-2 px-4 py-3 text-base border border-border rounded-lg bg-background"
              />
              {draft.startDate && draft.endDate && draft.endDate < draft.startDate && (
                <p className="text-xs text-destructive mt-2">Bitmə tarixi başlama tarixindən əvvəl ola bilməz.</p>
              )}
            </div>
          )}

          {step === 5 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Qiymətləndirmə bal sistemi *</label>
              <div className="grid grid-cols-2 gap-3">
                {scoringSystems.map(s => {
                  const active = draft.scoringSystem === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update({ scoringSystem: s })}
                      className={`p-4 rounded-lg border text-sm font-medium transition-all flex items-center justify-between ${active ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30" : "border-border bg-card hover:border-primary/40 text-foreground"}`}
                    >
                      <span className="flex items-center gap-2"><Gauge className="w-4 h-4" />{s}</span>
                      {active && <Check className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-3">Bu seçim bütün hədəflərin qiymətləndirmələrində by default tətbiq olunur (sonradan hədəf üzrə dəyişmək olar).</p>
            </div>
          )}

          {step === 6 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">KPI təyinat növü *</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { v: "individual" as const, t: "Fərdi", d: "Şəxs(lər), komanda, struktur, vəzifə üzrə təyin oluna bilər", icon: User },
                  { v: "bulk" as const, t: "Toplu", d: "Yalnız komanda, struktur və vəzifə üzrə təyin olunur", icon: Users },
                ]).map(o => {
                  const Icon = o.icon;
                  const active = draft.mode === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => update({ mode: o.v })}
                      className={`p-4 text-left rounded-lg border transition-all ${active ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border bg-card hover:border-primary/40"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-5 h-5 text-primary" />
                        <span className="text-base font-semibold text-foreground">{o.t}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{o.d}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Son təyinetmə tarixi (deadline) *</label>
                <input
                  type="date"
                  value={draft.lifecycle.assignmentDeadline}
                  onChange={e => updLifecycle({ assignmentDeadline: e.target.value })}
                  className="w-full mt-2 px-4 py-2.5 text-sm border border-border rounded-lg bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Qiymətləndirmə başlanğıcı</label>
                  <input
                    type="date"
                    value={draft.lifecycle.evaluationStart}
                    onChange={e => updLifecycle({ evaluationStart: e.target.value })}
                    className="w-full mt-2 px-4 py-2.5 text-sm border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Qiymətləndirmə son tarixi</label>
                  <input
                    type="date"
                    value={draft.lifecycle.evaluationEnd}
                    onChange={e => updLifecycle({ evaluationEnd: e.target.value })}
                    className="w-full mt-2 px-4 py-2.5 text-sm border border-border rounded-lg bg-background"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Review tarixləri (opsional)</label>
                  <button
                    type="button"
                    onClick={() => updLifecycle({ reviews: [...draft.lifecycle.reviews, ""] })}
                    className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground"
                  >+ Review əlavə et</button>
                </div>
                {draft.lifecycle.reviews.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Hələ review tarixi yoxdur.</p>
                ) : (
                  <div className="space-y-2">
                    {draft.lifecycle.reviews.map((r, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <span className="text-xs text-muted-foreground w-16">Review {i + 1}</span>
                        <input
                          type="date"
                          value={r}
                          onChange={e => {
                            const arr = [...draft.lifecycle.reviews];
                            arr[i] = e.target.value;
                            updLifecycle({ reviews: arr });
                          }}
                          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                        />
                        <button
                          type="button"
                          onClick={() => updLifecycle({ reviews: draft.lifecycle.reviews.filter((_, j) => j !== i) })}
                          className="text-xs px-2 py-2 rounded border border-border text-destructive"
                        >Sil</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 8 && (
            <div>
              <label className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${draft.useMatrix ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
                <input
                  type="checkbox"
                  checked={draft.useMatrix}
                  onChange={e => update({ useMatrix: e.target.checked })}
                  className="w-5 h-5 mt-0.5"
                />
                <div>
                  <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Təsdiqləmə matrisi tətbiq olunacaqmı?
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Aktiv edildikdə bütün hədəf təyinatları bitdikdən sonra kart "Təsdiq gözlənilir" statusuna keçəcək. Aktiv edilmədikdə kart birbaşa "Aktiv" statusuna keçir.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* === STEP 9: HƏDƏFLƏR (10-16 birləşdirilib) === */}
          {step === 9 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Hədəflər siyahısı</h3>
                  <p className="text-xs text-muted-foreground">9 mümkün hədəf növü · ümumi çəki 100% olmalıdır</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${totalWeight === 100 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                    Ümumi: {totalWeight}%
                  </span>
                  <button type="button" onClick={addHedef} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">
                    <Plus className="w-3.5 h-3.5" /> Hədəf əlavə et
                  </button>
                </div>
              </div>

              {draft.targets.length === 0 && (
                <div className="text-center py-10 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
                  Hələ hədəf əlavə edilməyib — "Hədəf əlavə et" düyməsindən başlayın.
                </div>
              )}

              {draft.targets.map((t, idx) => (
                <div key={t.id} className="relative p-3 rounded-lg border border-border bg-card/40 space-y-3">
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button type="button" title="Kopyala" onClick={() => copyHedef(t.id)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                      <Repeat className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" title="Sil" onClick={() => removeHedef(t.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground">Hədəf #{idx + 1}</div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-6">
                      <label className="text-[11px] text-muted-foreground">Hədəfin adı *</label>
                      <input value={t.name} onChange={e => updHedef(t.id, { name: e.target.value })}
                        placeholder="Məsələn: Rüblük satış həcmi"
                        className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[11px] text-muted-foreground">Növ *</label>
                      <select value={t.type} onChange={e => updHedef(t.id, { type: e.target.value as HedefType })}
                        className="w-full mt-0.5 px-2 py-1.5 text-sm border border-border rounded bg-background">
                        {HEDEF_TYPES.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="text-[11px] text-muted-foreground">Çəki (%) *</label>
                      <input type="number" min={0} max={100} value={t.weight}
                        onChange={e => updHedef(t.id, { weight: Number(e.target.value) })}
                        className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-3">
                      <label className="text-[11px] text-muted-foreground">Ölçü vahidi</label>
                      <input value={t.unit} onChange={e => updHedef(t.id, { unit: e.target.value })}
                        placeholder="AZN / ədəd / % / saat"
                        className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[11px] text-muted-foreground">Hədəf dəyəri</label>
                      <input value={t.targetValue} onChange={e => updHedef(t.id, { targetValue: e.target.value })}
                        placeholder="100000"
                        className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
                    </div>
                    <div className="col-span-6">
                      <label className="text-[11px] text-muted-foreground">Hesablama düsturu / qaydası</label>
                      <input value={t.formula} onChange={e => updHedef(t.id, { formula: e.target.value })}
                        placeholder="Məs: (Faktiki / Plan) * 100"
                        className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4">
                      <label className="text-[11px] text-muted-foreground">Qiymətləndirici</label>
                      <input value={t.evaluator} onChange={e => updHedef(t.id, { evaluator: e.target.value })}
                        placeholder="Ad və ya vəzifə"
                        className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
                    </div>
                    <div className="col-span-4">
                      <label className="text-[11px] text-muted-foreground">Təyin edən</label>
                      <input value={t.assigner} onChange={e => updHedef(t.id, { assigner: e.target.value })}
                        placeholder="Rəhbər və ya HR"
                        className="w-full mt-0.5 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
                    </div>
                    <div className="col-span-4">
                      <label className="text-[11px] text-muted-foreground">Bal sistemi (override)</label>
                      <select value={t.scoringSystem} onChange={e => updHedef(t.id, { scoringSystem: e.target.value })}
                        className="w-full mt-0.5 px-2 py-1.5 text-sm border border-border rounded bg-background">
                        <option value="">— Kart default-u —</option>
                        {scoringSystems.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer pt-1">
                    <input type="checkbox" checked={t.cascading} onChange={e => updHedef(t.id, { cascading: e.target.checked })} className="w-4 h-4" />
                    <GitBranch className="w-3.5 h-3.5 text-primary" />
                    Bu hədəf üzrə cascade tətbiq olunur (alt-bölmələrə paylanır)
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* === STEP 10: TƏYİNETMƏLƏR (17) === */}
          {step === 10 && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Hər hədəf üzrə təyinetmələr</h3>
                <p className="text-xs text-muted-foreground">
                  {draft.mode === "individual"
                    ? "Fərdi rejim: şəxs, komanda, struktur və ya vəzifə seçə bilərsiniz."
                    : "Toplu rejim: yalnız komanda, struktur və ya vəzifə seçilə bilər."}
                </p>
              </div>
              {draft.targets.map((t, i) => {
                const rows = draft.assignments.filter(a => a.targetId === t.id);
                return (
                  <div key={t.id} className="p-3 rounded-lg border border-border bg-card/40">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-foreground">
                        Hədəf #{i + 1}: <span className="text-primary">{t.name || "—"}</span>
                        <span className="text-xs text-muted-foreground ml-2">({t.type} · {t.weight}%)</span>
                      </div>
                      <button type="button" onClick={() => addAssignment(t.id)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground">
                        <Plus className="w-3 h-3" /> Təyinat
                      </button>
                    </div>
                    {rows.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Təyinat əlavə edilməyib.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {rows.map(a => (
                          <div key={a.id} className="flex gap-2 items-center">
                            <select value={a.assigneeKind}
                              onChange={e => updAssignment(a.id, { assigneeKind: e.target.value as WizardAssignment["assigneeKind"] })}
                              className="px-2 py-1.5 text-sm border border-border rounded bg-background">
                              {allowedKinds().map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <input value={a.assigneeName} onChange={e => updAssignment(a.id, { assigneeName: e.target.value })}
                              placeholder={`${a.assigneeKind} adı`}
                              className="flex-1 px-2.5 py-1.5 text-sm border border-border rounded bg-background" />
                            <button type="button" onClick={() => removeAssignment(a.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {draft.targets.length === 0 && (
                <div className="text-center py-10 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
                  Əvvəlcə əvvəlki addımda hədəf əlavə edin.
                </div>
              )}
            </div>
          )}

          {/* === STEP 11: YEKUN === */}
          {step === 11 && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-border bg-secondary/30 space-y-2">
                <SummaryRow label="KPI adı" value={draft.name} />
                <SummaryRow label="Dövrülük" value={draft.frequency} />
                <SummaryRow label="Müddət" value={`${draft.startDate} → ${draft.endDate}`} />
                <SummaryRow label="Bal sistemi" value={draft.scoringSystem} />
                <SummaryRow label="Təyinat növü" value={draft.mode === "individual" ? "Fərdi" : "Toplu"} />
                <SummaryRow label="Təyinetmə deadline" value={draft.lifecycle.assignmentDeadline || "—"} />
                <SummaryRow label="Qiymətləndirmə müddəti" value={draft.lifecycle.evaluationStart && draft.lifecycle.evaluationEnd ? `${draft.lifecycle.evaluationStart} → ${draft.lifecycle.evaluationEnd}` : "—"} />
                <SummaryRow label="Review tarixləri" value={draft.lifecycle.reviews.filter(Boolean).join(", ") || "—"} />
                <SummaryRow label="Təsdiq matrisi" value={draft.useMatrix ? "Bəli" : "Xeyr"} />
                <SummaryRow label="Hədəf sayı" value={`${draft.targets.length} (ümumi çəki: ${totalWeight}%)`} />
                <SummaryRow label="Təyinat sayı" value={`${draft.assignments.length}`} />
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <div className="px-3 py-2 bg-secondary/40 text-xs font-semibold text-foreground">Hədəflər və təyinatlar</div>
                <div className="divide-y divide-border">
                  {draft.targets.map((t, i) => (
                    <div key={t.id} className="px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">#{i + 1} {t.name} <span className="text-muted-foreground">({t.type} · {t.weight}%{t.cascading ? " · cascade" : ""})</span></span>
                        <span className="text-muted-foreground">{draft.assignments.filter(a => a.targetId === t.id).length} təyinat</span>
                      </div>
                      {t.formula && <div className="text-muted-foreground mt-0.5">Düstur: {t.formula}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-4 border-t border-border mt-4">
          <button
            type="button"
            onClick={() => step > 1 && setStep(step - 1)}
            disabled={step === 1}
            className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg border border-border bg-card text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
          <div className="text-xs text-muted-foreground">{step} / {TOTAL_STEPS}</div>
          <div className="flex gap-2">
            <button type="button" onClick={close} className="px-4 py-2 text-sm rounded-lg border border-border bg-card">Ləğv et</button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              className="flex items-center gap-1 px-5 py-2 text-sm rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium disabled:opacity-50"
            >
              {step === TOTAL_STEPS ? "Tamamla" : "Növbəti"} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value || "—"}</span>
    </div>
  );
}

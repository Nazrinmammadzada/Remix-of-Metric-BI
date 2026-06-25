import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCatalogValues } from "@/lib/dropdownCatalogStore";
import { Check, ChevronLeft, ChevronRight, Sparkles, CalendarDays, Gauge, Users, User, ShieldCheck, Repeat } from "lucide-react";
import { toast } from "sonner";

export interface CreateKpiWizardDraft {
  name: string;
  frequency: string;
  startDate: string;
  endDate: string;
  scoringSystem: string;
  mode: "individual" | "bulk"; // Fərdi / Toplu
  lifecycle: {
    assignmentDeadline: string; // son təyinetmə tarixi
    reviews: string[]; // review tarixləri
    evaluationStart: string;
    evaluationEnd: string;
  };
  useMatrix: boolean;
  // Mərhələ 3+ üçün — sonradan doldurulacaq
  targets?: any[];
  assignments?: any[];
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
});

const TOTAL_STEPS = 9;

const STEPS: { n: number; title: string; sub: string; icon: any }[] = [
  { n: 1, title: "KPI adı", sub: "KPI üçün başlıq daxil edin", icon: Sparkles },
  { n: 2, title: "Dövrülük", sub: "Hesablama dövrünü seçin", icon: Repeat },
  { n: 3, title: "Başlama tarixi", sub: "KPI nə vaxt başlayır", icon: CalendarDays },
  { n: 4, title: "Bitmə tarixi", sub: "KPI nə vaxt bitir", icon: CalendarDays },
  { n: 5, title: "Bal sistemi", sub: "Qiymətləndirmə üçün default bal sistemi", icon: Gauge },
  { n: 6, title: "Təyinat növü", sub: "Fərdi yoxsa Toplu KPI", icon: Users },
  { n: 7, title: "Lifecycle", sub: "Təyinetmə / Review / Qiymətləndirmə müddəti", icon: CalendarDays },
  { n: 8, title: "Təsdiq matrisi", sub: "Matris tətbiq olunacaqmı?", icon: ShieldCheck },
  { n: 9, title: "Yekun", sub: "Məlumatları yoxlayın", icon: Check },
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
      case 9: return true;
      default: return false;
    }
  }, [step, draft]);

  const close = () => {
    onOpenChange(false);
    setTimeout(() => { setStep(1); setDraft({ ...emptyKpiWizardDraft(), ...(initial || {}) }); }, 200);
  };

  const handleNext = () => {
    if (!canNext) { toast.error("Zəhmət olmasa bu sahəni doldurun"); return; }
    if (step < TOTAL_STEPS) setStep(step + 1);
    else {
      onComplete(draft);
      toast.success("KPI kartı üçün əsas məlumatlar saxlanıldı (Hədəflər addımı növbəti mərhələdə)");
      close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); else onOpenChange(true); }}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto">
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
                    Aktiv edildikdə bütün hədəf təyinatları bitdikdən sonra kart "Təsdiq gözlənilir" statusuna keçəcək və "Matris üzrə təsdiqə göndər" düyməsi görünəcək. Aktiv edilmədikdə kart birbaşa "Aktiv" statusuna keçir.
                  </p>
                </div>
              </label>
            </div>
          )}

          {step === 9 && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-border bg-secondary/30 space-y-2">
                <SummaryRow label="KPI adı" value={draft.name} />
                <SummaryRow label="Dövrülük" value={draft.frequency} />
                <SummaryRow label="Başlama" value={draft.startDate} />
                <SummaryRow label="Bitmə" value={draft.endDate} />
                <SummaryRow label="Bal sistemi" value={draft.scoringSystem} />
                <SummaryRow label="Təyinat növü" value={draft.mode === "individual" ? "Fərdi" : "Toplu"} />
                <SummaryRow label="Təyinetmə deadline" value={draft.lifecycle.assignmentDeadline || "—"} />
                <SummaryRow label="Qiymətləndirmə müddəti" value={draft.lifecycle.evaluationStart && draft.lifecycle.evaluationEnd ? `${draft.lifecycle.evaluationStart} → ${draft.lifecycle.evaluationEnd}` : "—"} />
                <SummaryRow label="Review tarixləri" value={draft.lifecycle.reviews.filter(Boolean).join(", ") || "—"} />
                <SummaryRow label="Təsdiq matrisi" value={draft.useMatrix ? "Bəli" : "Xeyr"} />
              </div>
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 text-xs text-foreground">
                <strong>Növbəti mərhələ:</strong> Hədəflərin əlavə edilməsi (addım 10-16) və təyinetmələr (addım 17) modulun növbəti yenilənməsində aktivləşəcək. Hələlik kart bu məlumatlarla yaradılır və "Natamam" statusuna düşür.
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

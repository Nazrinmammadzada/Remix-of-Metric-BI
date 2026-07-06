import { useState } from "react";
import { ChevronDown, Plus, Trash2, Target, Star, Wallet, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCatalogValues } from "@/lib/dropdownCatalogStore";
import { getPeriods, formatPeriodRange } from "@/lib/teamsStore";
import type { CardLifecycle, LifecycleStage, LifecycleReview } from "@/lib/kpiLifecycleStore";


type Draft = Omit<CardLifecycle, "cardId" | "cardName" | "updatedAt">;

const LIFECYCLE_PERIOD_DEFAULTS = ["Günlük", "Həftəlik", "Aylıq", "Rüblük", "Yarımillik", "İllik"];
const OTHER = "Digər";

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());

const getCustomPeriods = () =>
  getPeriods().map(p => ({
    id: p.id,
    label: `${p.durationLabel} (${formatPeriodRange(p)})`,
    start: p.startDate,
    end: p.endDate,
  }));

interface StageFieldsProps {
  value: LifecycleStage;
  onChange: (v: LifecycleStage) => void;
  periods: string[];
}

const StageFields = ({ value, onChange, periods }: StageFieldsProps) => {
  const custom = getCustomPeriods();
  const all = [...periods, OTHER];
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className={value.period === OTHER ? "col-span-3 grid grid-cols-3 gap-2" : ""}>
        <div>
          <label className="text-[11px] text-muted-foreground">Dövr</label>
          <div className="relative">
            <select
              value={value.period}
              onChange={(e) => {
                const p = e.target.value;
                if (p === OTHER) {
                  onChange({ ...value, period: OTHER, customPeriodId: custom[0]?.id, customPeriodLabel: custom[0]?.label, start: custom[0]?.start || "", end: custom[0]?.end || "" });
                } else {
                  onChange({ ...value, period: p, customPeriodId: undefined, customPeriodLabel: undefined });
                }
              }}
              className="w-full mt-1 px-2 py-1.5 text-sm border border-border rounded bg-background appearance-none pr-7"
            >
              {all.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
        {value.period === OTHER && (
          <div className="col-span-2">
            <label className="text-[11px] text-muted-foreground">Məlumat kataloqundan dövr</label>
            {custom.length === 0 ? (
              <p className="mt-1 text-[11px] text-destructive">Kataloqda KPI dövrü yoxdur. Ayarlar → Məlumat Cədvəli → KPI Dövrü.</p>
            ) : (
              <select
                value={value.customPeriodId ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const f = custom.find(c => c.id === id);
                  if (f) onChange({ ...value, customPeriodId: id, customPeriodLabel: f.label, start: f.start, end: f.end });
                }}
                className="w-full mt-1 px-2 py-1.5 text-sm border border-border rounded bg-background"
              >
                {custom.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            )}
          </div>
        )}
      </div>
      {value.period !== OTHER && (
        <>
          <DateField label="Başlama" value={value.start} onChange={(v) => onChange({ ...value, start: v })} />
          <DateField label="Bitmə" value={value.end} onChange={(v) => onChange({ ...value, end: v })} />
        </>
      )}
    </div>
  );
};

// Popover + Calendar əsaslı date-picker — modalın scroll mövqeyini pozmur
const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseISO = (s: string): Date | undefined => {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};
const DateField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  return (
    <div>
      <label className="text-[11px] text-muted-foreground">{label}</label>
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full mt-1 px-2 py-1.5 text-sm border border-border rounded bg-background flex items-center justify-between gap-2 text-left hover:bg-secondary/40"
          >

            <span className={selected ? "text-foreground" : "text-muted-foreground"}>
              {selected ? selected.toLocaleDateString("az-AZ") : "Tarix seçin"}
            </span>
            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => { if (d) { onChange(toISO(d)); setOpen(false); } }}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};


interface StageBlockProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  value?: LifecycleStage;
  onChange: (v: LifecycleStage | undefined) => void;
  periods: string[];
}

const StageBlock = ({ title, icon: Icon, value, onChange, periods }: StageBlockProps) => {
  const [open, setOpen] = useState(!!value);
  const active = !!value;
  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            if (!active) {
              onChange({ period: periods[0] || "", start: "", end: "" });
              setOpen(true);
            } else {
              setOpen(o => !o);
            }
          }}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
        >
          <Plus className={`w-4 h-4 transition-transform ${active && open ? "rotate-45" : ""}`} />
        </button>
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground flex-1">{title}</span>
        {active && (
          <button type="button" onClick={() => { onChange(undefined); setOpen(false); }} className="p-1 rounded hover:bg-destructive/10">
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        )}
      </div>
      {active && open && value && (
        <div className="px-3 pb-3">
          <StageFields value={value} onChange={onChange} periods={periods} />
        </div>
      )}
    </div>
  );
};

interface ReviewsBlockProps {
  reviews: LifecycleReview[];
  onChange: (r: LifecycleReview[]) => void;
  periods: string[];
}

const ReviewsBlock = ({ reviews, onChange, periods }: ReviewsBlockProps) => {
  const [open, setOpen] = useState(reviews.length > 0);
  const addReview = () => {
    onChange([...reviews, { id: newId(), period: periods[0] || "", start: "", end: "" }]);
    setOpen(true);
  };
  return (
    <div className="border border-border rounded-lg bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => { if (reviews.length === 0) addReview(); else setOpen(o => !o); }}
          className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${reviews.length > 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
        >
          <Plus className={`w-4 h-4 transition-transform ${reviews.length > 0 && open ? "rotate-45" : ""}`} />
        </button>
        <RefreshCw className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground flex-1">KPI Review</span>
        {reviews.length > 0 && (
          <button type="button" onClick={addReview} className="text-[11px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20">
            + Review əlavə et
          </button>
        )}
      </div>
      {open && reviews.length > 0 && (
        <div className="px-3 pb-3 space-y-3">
          {reviews.map((r, i) => (
            <div key={r.id} className="border border-border rounded-md p-2 bg-background">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Review #{i + 1}</span>
                <button type="button" onClick={() => onChange(reviews.filter(x => x.id !== r.id))} className="p-1 rounded hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
              <StageFields
                value={r}
                onChange={(v) => onChange(reviews.map(x => x.id === r.id ? { ...v, id: r.id } : x))}
                periods={periods}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface Props {
  value: Draft;
  onChange: (v: Draft) => void;
}

const LifecycleWizardStep = ({ value, onChange }: Props) => {
  const periods = useCatalogValues("kpi_lifecycle_periods", LIFECYCLE_PERIOD_DEFAULTS);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        KPI-ın hər mərhələsinin dövrünü və tarix aralığını təyin edin. "Digər" seçildikdə Məlumat Kataloqundakı KPI dövrlərindən istifadə olunur.
      </p>
      <StageBlock title="KPI təyin olunması" icon={Target} value={value.assignment} onChange={(v) => onChange({ ...value, assignment: v })} periods={periods} />
      <StageBlock title="KPI qiymətləndirilməsi" icon={Star} value={value.evaluation} onChange={(v) => onChange({ ...value, evaluation: v })} periods={periods} />
      <StageBlock title="Bonusun hesablanması" icon={Wallet} value={value.bonus} onChange={(v) => onChange({ ...value, bonus: v })} periods={periods} />
      <ReviewsBlock reviews={value.reviews} onChange={(r) => onChange({ ...value, reviews: r })} periods={periods} />
    </div>
  );
};

export default LifecycleWizardStep;

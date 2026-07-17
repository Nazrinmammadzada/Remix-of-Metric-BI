import { useMemo } from "react";
import type {
  ScheduleConfig, FrequencyKind, Weekday, WeekOfMonth, MonthlyMode, CustomUnit,
} from "@/lib/notificationSettingsStore";
import { FREQUENCY_LABELS } from "@/lib/notificationSettingsStore";

// Bakı əsas — genişləndirilə bilər.
const TIMEZONES = ["Asia/Baku", "UTC", "Europe/Moscow", "Europe/Istanbul", "Europe/London", "Asia/Dubai"];
const MONTHS_AZ = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
const WEEKDAYS_AZ: { v: Weekday; label: string }[] = [
  { v: 1, label: "Bazar ertəsi" },
  { v: 2, label: "Çərşənbə axşamı" },
  { v: 3, label: "Çərşənbə" },
  { v: 4, label: "Cümə axşamı" },
  { v: 5, label: "Cümə" },
  { v: 6, label: "Şənbə" },
  { v: 7, label: "Bazar" },
];
const WEEK_OF_MONTH_LABEL: Record<WeekOfMonth, string> = {
  first: "ilk", second: "ikinci", third: "üçüncü", fourth: "dördüncü", last: "son",
};

const inputCls = "w-full px-3 py-2 text-sm border border-border rounded-lg bg-background";
const labelCls = "text-xs font-medium text-muted-foreground mb-1 block";

interface Props {
  value: ScheduleConfig;
  onChange: (next: ScheduleConfig) => void;
}

const TzSelect = ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => (
  <div>
    <label className={labelCls}>Saat qurşağı</label>
    <select value={value || "Asia/Baku"} onChange={e => onChange(e.target.value)} className={inputCls}>
      {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  </div>
);

const TimeInput = ({ value, onChange, label = "Saat" }: { value?: string; onChange: (v: string) => void; label?: string }) => (
  <div>
    <label className={labelCls}>{label}</label>
    <input type="time" value={value || "09:00"} onChange={e => onChange(e.target.value)} className={inputCls} />
  </div>
);

const DateInput = ({ value, onChange, label }: { value?: string; onChange: (v: string) => void; label: string }) => (
  <div>
    <label className={labelCls}>{label}</label>
    <input type="date" value={value || ""} onChange={e => onChange(e.target.value)} className={inputCls} />
  </div>
);

const Info = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs text-muted-foreground bg-secondary/40 border border-border/60 rounded-lg p-2.5">{children}</div>
);

// ── Xülasə ─────────────────────────────────────────────────
const fmtDate = (iso?: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS_AZ[Number(m) - 1]} ${y}`;
};

const summarize = (s: ScheduleConfig): string => {
  const t = s.time || "09:00";
  switch (s.kind) {
    case "on_event": return `Hadisə baş verdikdə, saat ${t}`;
    case "on_date": return s.date ? `${fmtDate(s.date)} saat ${t}` : "Tarix seçin";
    case "daily":
      return `Hər gün saat ${t}${s.startDate ? ` (${fmtDate(s.startDate)}${s.endDate ? ` – ${fmtDate(s.endDate)}` : ""})` : ""}`;
    case "weekly": {
      const days = (s.weekdays || []).map(w => WEEKDAYS_AZ.find(x => x.v === w)?.label).filter(Boolean).join(", ");
      return days ? `Hər həftə: ${days} saat ${t}` : "Həftə günü seçin";
    }
    case "monthly":
      if (s.monthlyMode === "weekOfMonth" && s.weekOfMonth && s.weekday) {
        const w = WEEKDAYS_AZ.find(x => x.v === s.weekday)?.label;
        return `Hər ayın ${WEEK_OF_MONTH_LABEL[s.weekOfMonth]} ${w}-si saat ${t}`;
      }
      return `Hər ayın ${s.dayOfMonth ?? 1}-i saat ${t}`;
    case "quarterly":
      return `Hər ${["I","II","III","IV"][(s.quarter ?? 1) - 1]} rübün ${MONTHS_AZ[(s.month ?? 1) - 1]} ayı ${s.day ?? 1}-i saat ${t}`;
    case "yearly":
      return `Hər il ${s.day ?? 1} ${MONTHS_AZ[(s.month ?? 1) - 1]} saat ${t}`;
    case "custom": {
      const unit = s.customUnit === "week" ? "həftə" : s.customUnit === "month" ? "ay" : "gün";
      const range = s.startDate ? `${fmtDate(s.startDate)}${s.endDate ? ` – ${fmtDate(s.endDate)}` : ""}` : "";
      return `Hər ${s.repeatEvery ?? 1} ${unit} bir${range ? ` (${range})` : ""}${s.cron ? ` · cron: ${s.cron}` : ""}`;
    }
  }
};

// ── Əsas komponent ─────────────────────────────────────────
const NotificationSchedulePicker = ({ value: s, onChange }: Props) => {
  const set = (patch: Partial<ScheduleConfig>) => onChange({ ...s, ...patch });

  const setKind = (kind: FrequencyKind) => {
    // Növü dəyişəndə defaults tətbiq et.
    const base: ScheduleConfig = { kind, time: s.time || "09:00", timezone: s.timezone || "Asia/Baku" };
    if (kind === "monthly") { base.monthlyMode = "dayOfMonth"; base.dayOfMonth = 1; }
    if (kind === "weekly") base.weekdays = [1];
    if (kind === "quarterly") { base.quarter = 1; base.month = 1; base.day = 1; }
    if (kind === "yearly") { base.month = 1; base.day = 1; }
    if (kind === "custom") { base.repeatEvery = 1; base.customUnit = "day"; }
    onChange(base);
  };

  const toggleWeekday = (w: Weekday) => {
    const cur = new Set(s.weekdays || []);
    cur.has(w) ? cur.delete(w) : cur.add(w);
    set({ weekdays: Array.from(cur).sort() as Weekday[] });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Tezlik</label>
        <select
          value={s.kind}
          onChange={e => setKind(e.target.value as FrequencyKind)}
          className={inputCls}
        >
          {(Object.keys(FREQUENCY_LABELS) as FrequencyKind[]).map(k => (
            <option key={k} value={k}>{FREQUENCY_LABELS[k]}</option>
          ))}
        </select>
      </div>

      {/* Kind-specific fields */}
      {s.kind === "on_event" && (
        <div className="grid grid-cols-2 gap-3">
          <TimeInput value={s.time} onChange={v => set({ time: v })} label="Göndərmə vaxtı" />
          <TzSelect value={s.timezone} onChange={v => set({ timezone: v })} />
          <div className="col-span-2"><Info>Bildiriş hadisə baş verdiyi anda göndəriləcək.</Info></div>
        </div>
      )}

      {s.kind === "on_date" && (
        <div className="grid grid-cols-2 gap-3">
          <DateInput value={s.date} onChange={v => set({ date: v })} label="Tarix" />
          <TimeInput value={s.time} onChange={v => set({ time: v })} />
          <div className="col-span-2"><TzSelect value={s.timezone} onChange={v => set({ timezone: v })} /></div>
          <div className="col-span-2"><Info>Bildiriş seçilmiş tarix və saatda yalnız bir dəfə göndəriləcək.</Info></div>
        </div>
      )}

      {s.kind === "daily" && (
        <div className="grid grid-cols-2 gap-3">
          <DateInput value={s.startDate} onChange={v => set({ startDate: v })} label="Başlama tarixi" />
          <DateInput value={s.endDate} onChange={v => set({ endDate: v })} label="Bitmə tarixi (ixtiyari)" />
          <TimeInput value={s.time} onChange={v => set({ time: v })} />
          <TzSelect value={s.timezone} onChange={v => set({ timezone: v })} />
          <div className="col-span-2"><Info>Bildiriş hər gün seçilmiş saatda göndəriləcək.</Info></div>
        </div>
      )}

      {s.kind === "weekly" && (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Həftənin günləri</label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS_AZ.map(d => {
                const on = (s.weekdays || []).includes(d.v);
                return (
                  <button
                    key={d.v}
                    type="button"
                    onClick={() => toggleWeekday(d.v)}
                    className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-secondary"}`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TimeInput value={s.time} onChange={v => set({ time: v })} />
            <TzSelect value={s.timezone} onChange={v => set({ timezone: v })} />
          </div>
          <Info>Bildiriş seçilmiş həftə günlərində göndəriləcək.</Info>
        </div>
      )}

      {s.kind === "monthly" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={s.monthlyMode !== "weekOfMonth"} onChange={() => set({ monthlyMode: "dayOfMonth" })} />
              Ayın günü
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="radio" checked={s.monthlyMode === "weekOfMonth"} onChange={() => set({ monthlyMode: "weekOfMonth", weekOfMonth: s.weekOfMonth || "first", weekday: s.weekday || 1 })} />
              Ayın ilk/ikinci/üçüncü/dördüncü/son həftəsi
            </label>
          </div>
          {s.monthlyMode !== "weekOfMonth" ? (
            <div>
              <label className={labelCls}>Ayın günü</label>
              <input type="number" min={1} max={31} value={s.dayOfMonth ?? 1} onChange={e => set({ dayOfMonth: Number(e.target.value) })} className={inputCls} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Həftə</label>
                <select value={s.weekOfMonth || "first"} onChange={e => set({ weekOfMonth: e.target.value as WeekOfMonth })} className={inputCls}>
                  {(Object.keys(WEEK_OF_MONTH_LABEL) as WeekOfMonth[]).map(k => (
                    <option key={k} value={k}>{WEEK_OF_MONTH_LABEL[k]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Həftənin günü</label>
                <select value={s.weekday || 1} onChange={e => set({ weekday: Number(e.target.value) as Weekday })} className={inputCls}>
                  {WEEKDAYS_AZ.map(d => <option key={d.v} value={d.v}>{d.label}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <TimeInput value={s.time} onChange={v => set({ time: v })} />
            <TzSelect value={s.timezone} onChange={v => set({ timezone: v })} />
          </div>
          <Info>Bildiriş hər ay avtomatik göndəriləcək.</Info>
        </div>
      )}

      {s.kind === "quarterly" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Rüb</label>
            <select value={s.quarter ?? 1} onChange={e => set({ quarter: Number(e.target.value) as 1|2|3|4 })} className={inputCls}>
              {[1,2,3,4].map(q => <option key={q} value={q}>{["I","II","III","IV"][q-1]}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Ay</label>
            <select value={s.month ?? 1} onChange={e => set({ month: Number(e.target.value) })} className={inputCls}>
              {MONTHS_AZ.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Gün</label>
            <input type="number" min={1} max={31} value={s.day ?? 1} onChange={e => set({ day: Number(e.target.value) })} className={inputCls} />
          </div>
          <TimeInput value={s.time} onChange={v => set({ time: v })} />
          <div className="col-span-2"><TzSelect value={s.timezone} onChange={v => set({ timezone: v })} /></div>
        </div>
      )}

      {s.kind === "yearly" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Ay</label>
            <select value={s.month ?? 1} onChange={e => set({ month: Number(e.target.value) })} className={inputCls}>
              {MONTHS_AZ.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Gün</label>
            <input type="number" min={1} max={31} value={s.day ?? 1} onChange={e => set({ day: Number(e.target.value) })} className={inputCls} />
          </div>
          <TimeInput value={s.time} onChange={v => set({ time: v })} />
          <TzSelect value={s.timezone} onChange={v => set({ timezone: v })} />
        </div>
      )}

      {s.kind === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <DateInput value={s.startDate} onChange={v => set({ startDate: v })} label="Başlama tarixi" />
          <DateInput value={s.endDate} onChange={v => set({ endDate: v })} label="Bitmə tarixi" />
          <div>
            <label className={labelCls}>Təkrarlanma intervalı</label>
            <input type="number" min={1} value={s.repeatEvery ?? 1} onChange={e => set({ repeatEvery: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Vahid</label>
            <select value={s.customUnit || "day"} onChange={e => set({ customUnit: e.target.value as CustomUnit })} className={inputCls}>
              <option value="day">Gün</option>
              <option value="week">Həftə</option>
              <option value="month">Ay</option>
            </select>
          </div>
          <TimeInput value={s.time} onChange={v => set({ time: v })} />
          <TzSelect value={s.timezone} onChange={v => set({ timezone: v })} />
          <div className="col-span-2">
            <label className={labelCls}>Advanced Schedule (Cron ifadəsi, ixtiyari)</label>
            <input value={s.cron || ""} onChange={e => set({ cron: e.target.value })} placeholder="0 9 * * 1-5" className={`${inputCls} font-mono`} />
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-border/60">
        <div className="text-xs text-muted-foreground">Cədvəl xülasəsi</div>
        <div className="text-sm text-foreground font-medium">• {summarize(s)}</div>
      </div>
    </div>
  );
};

export default NotificationSchedulePicker;

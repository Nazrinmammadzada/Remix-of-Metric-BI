import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getPeriods, formatPeriodRange, type KpiPeriod } from "@/lib/teamsStore";

export type PeriodType = "Günlük" | "Həftəlik" | "Aylıq" | "Rüblük" | "İllik" | "Digər";

export interface PeriodValue {
  type: PeriodType;
  // For native pickers
  date?: string; // YYYY-MM-DD (Günlük)
  weekStart?: string; // YYYY-MM-DD (Həftəlik start)
  weekEnd?: string; // YYYY-MM-DD (Həftəlik end)
  monthStart?: string; // YYYY-MM-DD (Aylıq başlama)
  monthEnd?: string; // YYYY-MM-DD (Aylıq bitmə)
  quarterYear?: string; // 2026 (Rüblük)
  quarter?: "Q1" | "Q2" | "Q3" | "Q4";
  yearStart?: string; // 2025 (İllik)
  yearEnd?: string; // 2026
  customPeriodId?: number; // Digər → KpiPeriod.id
}

const PERIOD_TYPES: PeriodType[] = ["Günlük", "Həftəlik", "Aylıq", "Rüblük", "İllik", "Digər"];
const QUARTERS: Array<{ key: "Q1" | "Q2" | "Q3" | "Q4"; label: string }> = [
  { key: "Q1", label: "Q1 (Yan-Mar)" },
  { key: "Q2", label: "Q2 (Apr-İyn)" },
  { key: "Q3", label: "Q3 (İyl-Sen)" },
  { key: "Q4", label: "Q4 (Okt-Dek)" },
];
const YEARS = ["2024", "2025", "2026", "2027", "2028"];

interface Props {
  value: PeriodValue;
  onChange: (v: PeriodValue) => void;
}

const PeriodPicker = ({ value, onChange }: Props) => {
  const [periods, setPeriods] = useState<KpiPeriod[]>(() => getPeriods());

  useEffect(() => {
    const refresh = () => setPeriods(getPeriods());
    window.addEventListener("periods-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("periods-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const inputCls =
    "w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Dövr tipi</label>
          <select
            value={value.type}
            onChange={(e) => onChange({ ...value, type: e.target.value as PeriodType })}
            className={`mt-1 ${inputCls}`}
          >
            {PERIOD_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">
            {value.type === "Günlük" && "Tarix"}
            {value.type === "Həftəlik" && "Həftə aralığı"}
            {value.type === "Aylıq" && "Ay aralığı"}
            {value.type === "Rüblük" && "İl / Rüb"}
            {value.type === "İllik" && "İl aralığı"}
            {value.type === "Digər" && "Mövcud dövrlər"}
          </label>

          {value.type === "Günlük" && (
            <input
              type="date"
              value={value.date || ""}
              onChange={(e) => onChange({ ...value, date: e.target.value })}
              className={`mt-1 ${inputCls}`}
            />
          )}

          {value.type === "Həftəlik" && (
            <div className="mt-1 grid grid-cols-2 gap-1">
              <input
                type="date"
                value={value.weekStart || ""}
                onChange={(e) => onChange({ ...value, weekStart: e.target.value })}
                className={inputCls}
              />
              <input
                type="date"
                value={value.weekEnd || ""}
                onChange={(e) => onChange({ ...value, weekEnd: e.target.value })}
                className={inputCls}
              />
            </div>
          )}

          {value.type === "Aylıq" && (
            <div className="mt-1 grid grid-cols-2 gap-1">
              <input
                type="date"
                value={value.monthStart || ""}
                onChange={(e) => onChange({ ...value, monthStart: e.target.value })}
                className={inputCls}
              />
              <input
                type="date"
                value={value.monthEnd || ""}
                onChange={(e) => onChange({ ...value, monthEnd: e.target.value })}
                className={inputCls}
              />
            </div>
          )}

          {value.type === "Rüblük" && (
            <div className="mt-1 grid grid-cols-2 gap-1">
              <select
                value={value.quarterYear || "2026"}
                onChange={(e) => onChange({ ...value, quarterYear: e.target.value })}
                className={inputCls}
              >
                {YEARS.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
              <select
                value={value.quarter || "Q1"}
                onChange={(e) =>
                  onChange({ ...value, quarter: e.target.value as "Q1" | "Q2" | "Q3" | "Q4" })
                }
                className={inputCls}
              >
                {QUARTERS.map((q) => (
                  <option key={q.key} value={q.key}>
                    {q.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {value.type === "İllik" && (
            <div className="mt-1 grid grid-cols-2 gap-1">
              <input
                type="date"
                value={value.yearStart || ""}
                onChange={(e) => onChange({ ...value, yearStart: e.target.value })}
                className={inputCls}
              />
              <input
                type="date"
                value={value.yearEnd || ""}
                onChange={(e) => onChange({ ...value, yearEnd: e.target.value })}
                className={inputCls}
              />
            </div>
          )}

          {value.type === "Digər" && (
            <select
              value={value.customPeriodId ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  customPeriodId: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className={`mt-1 ${inputCls}`}
            >
              <option value="">Dövr seçin</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.durationLabel} — {formatPeriodRange(p)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {value.type === "Digər" && periods.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          Hələ dövr yaradılmayıb. HR → Ayarlar → Məlumat Cədvəli → KPI Dövrü.
        </p>
      )}
    </div>
  );
};

export default PeriodPicker;

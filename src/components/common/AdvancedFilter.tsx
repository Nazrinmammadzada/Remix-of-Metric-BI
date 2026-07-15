import { useEffect, useMemo, useState } from "react";
import { Filter, Plus, X, RotateCcw, Check, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import type { DataTableColumn, FilterType } from "./DataTable";

export type AdvFieldType = "text" | "number" | "date" | "boolean";

export type AdvOperator =
  // text
  | "contains" | "startsWith" | "endsWith" | "eq" | "neq" | "empty" | "notEmpty"
  // number
  | "nEq" | "nNeq" | "gt" | "lt" | "gte" | "lte" | "between"
  // date
  | "dAfter" | "dBefore" | "dEq" | "dNeq" | "dBetween"
  // boolean
  | "bYes" | "bNo";

export interface AdvFilterRow {
  id: string;
  columnKey: string;
  operator: AdvOperator;
  value?: string;
  value2?: string;
}

export interface AdvFilterState {
  logic: "AND" | "OR";
  rows: AdvFilterRow[];
}

const OPERATOR_LABELS: Record<AdvOperator, string> = {
  contains: "İbarət olan",
  startsWith: "Başlayan",
  endsWith: "Bitən",
  eq: "Bərabər olan",
  neq: "Bərabər olmayan",
  empty: "Boş olan",
  notEmpty: "Boş olmayan",
  nEq: "Bərabər olan",
  nNeq: "Bərabər olmayan",
  gt: "Böyükdür",
  lt: "Kiçikdir",
  gte: "Böyük və ya bərabərdir",
  lte: "Kiçik və ya bərabərdir",
  between: "Aralıqdadır",
  dAfter: "Sonradır",
  dBefore: "Əvvəldir",
  dEq: "Bərabər olan",
  dNeq: "Bərabər olmayan",
  dBetween: "Tarix aralığında",
  bYes: "Bəli",
  bNo: "Xeyr",
};

const OPS_BY_TYPE: Record<AdvFieldType, AdvOperator[]> = {
  text: ["contains", "startsWith", "endsWith", "eq", "neq", "empty", "notEmpty"],
  number: ["nEq", "nNeq", "gt", "lt", "gte", "lte", "between", "empty", "notEmpty"],
  date: ["dAfter", "dBefore", "dEq", "dNeq", "dBetween", "empty", "notEmpty"],
  boolean: ["bYes", "bNo", "empty", "notEmpty"],
};

const toFieldType = (ft?: FilterType): AdvFieldType => {
  if (ft === "number") return "number";
  if (ft === "date") return "date";
  return "text";
};

const toText = (v: unknown): string => {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
};

const toNumber = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
};

const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
};

const isEmpty = (v: unknown): boolean => {
  if (v == null) return true;
  const s = String(v).trim();
  return s === "" || s === "-" || s === "—";
};

export function evaluateAdvFilter<T>(
  rows: T[],
  columns: DataTableColumn<T>[],
  state: AdvFilterState
): T[] {
  if (!state.rows.length) return rows;
  const colByKey = Object.fromEntries(columns.map(c => [c.key, c]));

  const check = (row: T, r: AdvFilterRow): boolean => {
    const c = colByKey[r.columnKey];
    if (!c) return true;
    const raw = c.accessor ? c.accessor(row) : undefined;

    switch (r.operator) {
      case "empty": return isEmpty(raw);
      case "notEmpty": return !isEmpty(raw);
      case "contains": return toText(raw).toLowerCase().includes((r.value ?? "").toLowerCase());
      case "startsWith": return toText(raw).toLowerCase().startsWith((r.value ?? "").toLowerCase());
      case "endsWith": return toText(raw).toLowerCase().endsWith((r.value ?? "").toLowerCase());
      case "eq": return toText(raw).toLowerCase() === (r.value ?? "").toLowerCase();
      case "neq": return toText(raw).toLowerCase() !== (r.value ?? "").toLowerCase();
      case "nEq": { const n = toNumber(raw); const a = toNumber(r.value); return n != null && a != null && n === a; }
      case "nNeq": { const n = toNumber(raw); const a = toNumber(r.value); return n != null && a != null && n !== a; }
      case "gt": { const n = toNumber(raw); const a = toNumber(r.value); return n != null && a != null && n > a; }
      case "lt": { const n = toNumber(raw); const a = toNumber(r.value); return n != null && a != null && n < a; }
      case "gte": { const n = toNumber(raw); const a = toNumber(r.value); return n != null && a != null && n >= a; }
      case "lte": { const n = toNumber(raw); const a = toNumber(r.value); return n != null && a != null && n <= a; }
      case "between": {
        const n = toNumber(raw); const a = toNumber(r.value); const b = toNumber(r.value2);
        return n != null && a != null && b != null && n >= a && n <= b;
      }
      case "dEq": { const d = toDate(raw); const a = toDate(r.value); return !!d && !!a && d.toDateString() === a.toDateString(); }
      case "dNeq": { const d = toDate(raw); const a = toDate(r.value); return !!d && !!a && d.toDateString() !== a.toDateString(); }
      case "dAfter": { const d = toDate(raw); const a = toDate(r.value); return !!d && !!a && d > a; }
      case "dBefore": { const d = toDate(raw); const a = toDate(r.value); return !!d && !!a && d < a; }
      case "dBetween": {
        const d = toDate(raw); const a = toDate(r.value); const b = toDate(r.value2);
        if (!d || !a || !b) return false;
        const end = new Date(b); end.setHours(23,59,59,999);
        return d >= a && d <= end;
      }
      case "bYes": { const t = toText(raw).toLowerCase(); return ["true","1","bəli","beli","yes","aktiv","tamamlandı","tamamlandi","təsdiqləndi","tesdiqlendi","✓"].some(x => t.includes(x)); }
      case "bNo": { const t = toText(raw).toLowerCase(); return ["false","0","xeyr","no","deaktiv","imtina","rədd","redd","✗"].some(x => t.includes(x)); }
      default: return true;
    }
  };

  return rows.filter(row => {
    if (state.logic === "AND") return state.rows.every(r => check(row, r));
    return state.rows.some(r => check(row, r));
  });
}

interface AdvancedFilterProps<T> {
  columns: DataTableColumn<T>[];
  value: AdvFilterState;
  onChange: (v: AdvFilterState) => void;
}

const NO_VALUE_OPS: AdvOperator[] = ["empty", "notEmpty", "bYes", "bNo"];
const TWO_VALUE_OPS: AdvOperator[] = ["between", "dBetween"];

export function AdvancedFilter<T>({ columns, value, onChange }: AdvancedFilterProps<T>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AdvFilterState>(value);
  const [colSearch, setColSearch] = useState("");

  useEffect(() => { if (open) setDraft(value); }, [open, value]);

  const filterable = useMemo(
    () => columns.filter(c => (c.filterType ?? "text") !== "none"),
    [columns]
  );

  const addRow = () => {
    const firstCol = filterable[0];
    if (!firstCol) return;
    const ft = toFieldType(firstCol.filterType);
    setDraft(d => ({
      ...d,
      rows: [...d.rows, {
        id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        columnKey: firstCol.key,
        operator: OPS_BY_TYPE[ft][0],
        value: "",
      }],
    }));
  };

  const updateRow = (id: string, patch: Partial<AdvFilterRow>) => {
    setDraft(d => ({
      ...d,
      rows: d.rows.map(r => r.id === id ? { ...r, ...patch } : r),
    }));
  };

  const removeRow = (id: string) => {
    setDraft(d => ({ ...d, rows: d.rows.filter(r => r.id !== id) }));
  };

  const reset = () => setDraft({ logic: "AND", rows: [] });

  const apply = () => {
    onChange({
      logic: "AND",
      rows: draft.rows.filter(r => {
        if (NO_VALUE_OPS.includes(r.operator)) return true;
        if (TWO_VALUE_OPS.includes(r.operator)) return !!r.value && !!r.value2;
        return r.value != null && String(r.value).trim() !== "";
      }),
    });
    setOpen(false);
  };

  const activeCount = value.rows.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 relative">
          <Filter className="w-4 h-4" />
          Filter
          {activeCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(720px,calc(100vw-2rem))] p-0 bg-popover"
        onEscapeKeyDown={() => setOpen(false)}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <div className="font-semibold text-sm">Ətraflı Filter</div>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-2">
          {draft.rows.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">
              Filter yoxdur. Aşağıdakı düymə ilə yeni filter əlavə edin.
            </div>
          )}
          {draft.rows.map((row, idx) => {
            const col = filterable.find(c => c.key === row.columnKey);
            const ft = toFieldType(col?.filterType);
            const ops = OPS_BY_TYPE[ft];
            const inputType: "text" | "number" | "date" | "boolean" | "none" =
              NO_VALUE_OPS.includes(row.operator) ? "none" : ft;

            const filteredCols = filterable.filter(c =>
              c.label.toLowerCase().includes(colSearch.toLowerCase())
            );

            return (
              <div key={row.id} className="flex flex-wrap items-start gap-2 p-2 rounded-lg border border-border bg-secondary/20">
                {idx > 0 && (
                  <div className="text-[10px] font-semibold text-primary px-1.5 py-0.5 rounded bg-primary/10 self-center">
                    {draft.logic}
                  </div>
                )}
                {/* Column */}
                <div className="flex-1 min-w-[160px]">
                  <div className="relative mb-1">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Sütun axtar..."
                      value={colSearch}
                      onChange={e => setColSearch(e.target.value)}
                      className="w-full pl-7 pr-2 py-1 text-[11px] rounded border border-border bg-background"
                    />
                  </div>
                  <select
                    value={row.columnKey}
                    onChange={e => {
                      const newCol = filterable.find(c => c.key === e.target.value);
                      const newFt = toFieldType(newCol?.filterType);
                      updateRow(row.id, {
                        columnKey: e.target.value,
                        operator: OPS_BY_TYPE[newFt][0],
                        value: "",
                        value2: "",
                      });
                    }}
                    className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background truncate"
                  >
                    {filteredCols.map(c => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Operator */}
                <select
                  value={row.operator}
                  onChange={e => updateRow(row.id, { operator: e.target.value as AdvOperator, value: "", value2: "" })}
                  className="min-w-[150px] px-2 py-1.5 text-xs rounded-md border border-border bg-background self-end"
                >
                  {ops.map(op => (
                    <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                  ))}
                </select>

                {/* Value */}
                <div className="flex-1 min-w-[160px] self-end flex gap-1">
                  {inputType === "none" && (
                    <div className="text-[11px] text-muted-foreground italic px-2 py-1.5">Dəyər tələb olunmur</div>
                  )}
                  {inputType === "text" && col?.filterType === "select" ? (
                    <select
                      value={row.value ?? ""}
                      onChange={e => updateRow(row.id, { value: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background"
                    >
                      <option value="">Seçin...</option>
                      {(col.selectOptions ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : inputType === "text" ? (
                    <input
                      type="text"
                      value={row.value ?? ""}
                      onChange={e => updateRow(row.id, { value: e.target.value })}
                      placeholder="Dəyər..."
                      className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background"
                    />
                  ) : null}
                  {inputType === "number" && (
                    <>
                      <input
                        type="number"
                        value={row.value ?? ""}
                        onChange={e => updateRow(row.id, { value: e.target.value })}
                        placeholder={row.operator === "between" ? "min" : "dəyər"}
                        className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background"
                      />
                      {row.operator === "between" && (
                        <input
                          type="number"
                          value={row.value2 ?? ""}
                          onChange={e => updateRow(row.id, { value2: e.target.value })}
                          placeholder="max"
                          className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background"
                        />
                      )}
                    </>
                  )}
                  {inputType === "date" && (
                    <>
                      <input
                        type="date"
                        value={row.value ?? ""}
                        onChange={e => updateRow(row.id, { value: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background"
                      />
                      {row.operator === "dBetween" && (
                        <input
                          type="date"
                          value={row.value2 ?? ""}
                          onChange={e => updateRow(row.id, { value2: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background"
                        />
                      )}
                    </>
                  )}
                  {inputType === "boolean" && (
                    <select
                      value={row.value ?? ""}
                      onChange={e => updateRow(row.id, { value: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background"
                    >
                      <option value="">Seçin...</option>
                      <option value="yes">Bəli</option>
                      <option value="no">Xeyr</option>
                    </select>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="self-end p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Sil"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addRow}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-border text-xs text-primary hover:bg-primary/5"
          >
            <Plus className="w-4 h-4" /> Filter əlavə et
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-secondary/20">
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1 text-xs">
            <RotateCcw className="w-3.5 h-3.5" /> Sıfırla
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="text-xs">Ləğv et</Button>
            <Button size="sm" onClick={apply} className="gap-1 text-xs">
              <Check className="w-3.5 h-3.5" /> Tətbiq et
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

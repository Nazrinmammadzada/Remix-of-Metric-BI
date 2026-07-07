// Reusable table toolbar — unifies "Sütunlar", "Şrift ölçüsü",
// "Sətir sayı" və "Sütun eni" idarəetmələrini Əməkdaşlar Siyahısı stilində
// digər cədvəllərə də gətirir.
//
// İstifadə nümunəsi:
//   const [tableState, setTableState] = useState(defaultTableState);
//   <TableToolbar columns={cols} state={tableState} onChange={setTableState} />
//   <table style={{ fontSize: tableState.fontSize }}>...</table>

import { useMemo } from "react";
import { Columns, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export interface ToolbarColumn { key: string; label: string; }

export interface TableToolbarState {
  visible: Record<string, boolean>;
  fontSize: number;
  rowsPerPage: number;
  defaultColWidth: number;
}

export const defaultTableState: TableToolbarState = {
  visible: {},
  fontSize: 14,
  rowsPerPage: 10,
  defaultColWidth: 150,
};

interface Props {
  columns: ToolbarColumn[];
  state: TableToolbarState;
  onChange: (s: TableToolbarState) => void;
  className?: string;
  /** Toolbar-ın sağ tərəfinə əlavə düymələr/filtrlər */
  right?: React.ReactNode;
  /** Toolbar-ın sol tərəfinə əlavə düymələr/filtrlər */
  left?: React.ReactNode;
}

function Stepper({
  label, value, setValue, min, max, step = 1,
}: { label: string; value: number; setValue: (n: number) => void; min: number; max: number; step?: number }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <button type="button" onClick={() => setValue(Math.max(min, value - step))}
        className="w-6 h-6 rounded-md border border-border bg-background hover:bg-secondary flex items-center justify-center">
        <Minus className="w-3 h-3" />
      </button>
      <span className="w-8 text-center text-foreground font-semibold">{value}</span>
      <button type="button" onClick={() => setValue(Math.min(max, value + step))}
        className="w-6 h-6 rounded-md border border-border bg-background hover:bg-secondary flex items-center justify-center">
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function TableToolbar({ columns, state, onChange, className, right, left }: Props) {
  // Görünən sütunlar — ilkin dəyər: hamısı visible.
  const visible = useMemo(() => {
    const out: Record<string, boolean> = { ...state.visible };
    columns.forEach(c => { if (out[c.key] === undefined) out[c.key] = true; });
    return out;
  }, [columns, state.visible]);

  const patch = (p: Partial<TableToolbarState>) => onChange({ ...state, ...p });

  return (
    <div className={`rounded-xl border border-border bg-card ${className || ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Columns className="w-4 h-4" /> Sütunlar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2">
              <div className="space-y-1">
                {columns.map(c => (
                  <label key={c.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 cursor-pointer">
                    <Checkbox
                      checked={visible[c.key] !== false}
                      onCheckedChange={(v) => patch({ visible: { ...visible, [c.key]: !!v } })}
                    />
                    <span className="text-sm">{c.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {left}
        </div>
        {right}
      </div>
      <div className="flex flex-wrap items-center gap-4 px-3 py-2 text-xs text-muted-foreground bg-secondary/20">
        <Stepper label="Şrift ölçüsü" value={state.fontSize} setValue={(n) => patch({ fontSize: n })} min={10} max={24} />
        <Stepper label="Sətir sayı" value={state.rowsPerPage} setValue={(n) => patch({ rowsPerPage: n })} min={5} max={100} step={5} />
        <Stepper label="Sütun eni" value={state.defaultColWidth} setValue={(n) => patch({ defaultColWidth: n })} min={80} max={400} step={10} />
      </div>
    </div>
  );
}

/** Verilmiş axtarış mətninin sətirə uyğunlaşmasını yoxlayır (utility). */
export const matchesToolbarSearch = (haystack: string, needle: string) =>
  !needle || String(haystack || "").toLowerCase().includes(needle.toLowerCase());

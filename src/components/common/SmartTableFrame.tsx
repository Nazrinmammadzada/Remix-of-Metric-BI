// Sıfır-konfiqurasiyalı cədvəl wrapper — sütunları avtomatik olaraq <thead><th>-lərdən oxuyur.
// Mövcud <table>-i heç dəyişmədən sarımaq üçün: <SmartTableFrame><table>...</table></SmartTableFrame>
//
// Xüsusiyyətlər (Əməkdaşlar siyahısı toolbar-ı ilə eyni):
//  · Sütunlar (göstər/gizlət) — :nth-child ilə hədəflənir
//  · Şrift ölçüsü — wrapper style
//  · Sətir sayı — CSS ilə tbody sətirlərini məhdudlaşdırır
//  · Sütun eni — hər th/td üçün minWidth CSS dəyişəni
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import TableToolbar, { defaultTableState, type TableToolbarState, type ToolbarColumn } from "./TableToolbar";

interface Props {
  className?: string;
  /** İlkin state (məs. persistent localStorage-dan). Verilməzsə default istifadə olunur. */
  initialState?: TableToolbarState;
  /** Toolbar-ın sağ/sol tərəfinə əlavə. */
  toolbarRight?: React.ReactNode;
  toolbarLeft?: React.ReactNode;
  /** Sətir sayı məhdudlaşdırmasını söndür (məs. artıq pagination varsa). */
  disableRowLimit?: boolean;
  children: React.ReactNode;
}

let SCOPE_COUNTER = 0;

export default function SmartTableFrame({ className, initialState, toolbarRight, toolbarLeft, disableRowLimit, children }: Props) {
  const [state, setState] = useState<TableToolbarState>(initialState || defaultTableState);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<ToolbarColumn[]>([]);
  const scope = useMemo(() => `stf-${++SCOPE_COUNTER}`, []);

  // <thead><th>-lərdən avtomatik sütun kəşfi.
  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const table = wrapRef.current.querySelector("table");
    if (!table) return;
    const ths = table.querySelectorAll(":scope > thead > tr:first-child > th");
    if (ths.length === 0) return;
    const cols: ToolbarColumn[] = Array.from(ths).map((th, i) => {
      const raw = (th.textContent || "").replace(/\s+/g, " ").trim();
      const label = raw ? (raw.length > 40 ? raw.slice(0, 40) + "…" : raw) : `Sütun ${i + 1}`;
      return { key: `c${i}`, label };
    });
    setColumns(prev => {
      if (prev.length === cols.length && prev.every((c, i) => c.label === cols[i].label)) return prev;
      return cols;
    });
  });

  const css = useMemo(() => {
    const rules: string[] = [];
    columns.forEach((c, idx) => {
      if (state.visible[c.key] === false) {
        const n = idx + 1;
        rules.push(`.${scope} table > thead > tr > th:nth-child(${n}), .${scope} table > tbody > tr > td:nth-child(${n}), .${scope} table > tfoot > tr > td:nth-child(${n}) { display: none !important; }`);
      }
    });
    if (!disableRowLimit && state.rowsPerPage > 0) {
      rules.push(`.${scope} table > tbody > tr:nth-child(n+${state.rowsPerPage + 1}) { display: none !important; }`);
    }
    return rules.join("\n");
  }, [columns, state.visible, state.rowsPerPage, disableRowLimit, scope]);

  return (
    <div className={className} ref={wrapRef}>
      {columns.length > 0 && (
        <TableToolbar columns={columns} state={state} onChange={setState} right={toolbarRight} left={toolbarLeft} className="mb-3" />
      )}
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <div
        className={`${scope} [&_table_th]:min-w-[var(--stf-cw)] [&_table_td]:min-w-[var(--stf-cw)]`}
        style={{ fontSize: `${state.fontSize}px`, ["--stf-cw" as any]: `${state.defaultColWidth}px` }}
      >
        {children}
      </div>
    </div>
  );
}

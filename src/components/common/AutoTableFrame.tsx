// Zero-touch cədvəl wrapper — mövcud <table>-ə heç bir <th>/<td> dəyişikliyi tələb etmir.
// Sütun görünüşünü :nth-child ilə gizlədir, sətir sayını CSS ilə məhdudlaşdırır,
// şrift ölçüsünü və default sütun enini wrapper style vasitəsilə tətbiq edir.
//
// İstifadə:
//   const [s, setS] = useState(defaultTableState);
//   <AutoTableFrame columns={[{key:"name",label:"Ad"}, ...]} state={s} onChange={setS}>
//     <table>...</table>
//   </AutoTableFrame>
//
// QEYD: columns siyahısının sırası cədvəldəki <th> sırası ilə uyğun olmalıdır.
import { useId, useMemo } from "react";
import TableToolbar, { defaultTableState, type TableToolbarState, type ToolbarColumn } from "./TableToolbar";

interface Props {
  columns: ToolbarColumn[];
  state: TableToolbarState;
  onChange: (s: TableToolbarState) => void;
  toolbarRight?: React.ReactNode;
  toolbarLeft?: React.ReactNode;
  className?: string;
  /** Sətir sayını CSS ilə məhdudlaşdır (default: true). Bəzi virtualize/pagination-lu cədvəllərdə söndürün. */
  limitRows?: boolean;
  children: React.ReactNode;
}

export default function AutoTableFrame({ columns, state, onChange, toolbarRight, toolbarLeft, className, limitRows = true, children }: Props) {
  const scopeId = useId().replace(/[:]/g, "");
  const scope = `atf-${scopeId}`;

  const css = useMemo(() => {
    const rules: string[] = [];
    columns.forEach((c, idx) => {
      if (state.visible[c.key] === false) {
        const n = idx + 1;
        rules.push(`.${scope} table > thead > tr > th:nth-child(${n}), .${scope} table > tbody > tr > td:nth-child(${n}), .${scope} table > tfoot > tr > td:nth-child(${n}) { display: none !important; }`);
      }
    });
    if (limitRows && state.rowsPerPage > 0) {
      rules.push(`.${scope} table > tbody > tr:nth-child(n+${state.rowsPerPage + 1}) { display: none !important; }`);
    }
    return rules.join("\n");
  }, [columns, state.visible, state.rowsPerPage, limitRows, scope]);

  return (
    <div className={className}>
      <TableToolbar columns={columns} state={state} onChange={onChange} right={toolbarRight} left={toolbarLeft} className="mb-3" />
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <div
        className={`${scope} [&_table_th]:min-w-[var(--atf-cw)] [&_table_td]:min-w-[var(--atf-cw)]`}
        style={{ fontSize: `${state.fontSize}px`, ["--atf-cw" as any]: `${state.defaultColWidth}px` }}
      >
        {children}
      </div>
    </div>
  );
}

export { defaultTableState };
export type { TableToolbarState, ToolbarColumn };

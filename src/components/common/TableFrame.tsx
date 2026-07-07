// Cədvəllər üçün wrapper — TableToolbar-ı və onun state-ini bir yerdə tətbiq edir:
//  · fontSize  -> div style
//  · defaultColWidth -> hər th/td üçün minWidth (CSS variable)
//  · visible[key] -> data-col="key" olan th/td-ləri CSS ilə gizlədir
// Cəld inteqrasiya üçün: bütün <th>/<td>-lərə data-col="key" əlavə edin.
import { useMemo } from "react";
import TableToolbar, { defaultTableState, type TableToolbarState, type ToolbarColumn } from "./TableToolbar";

interface Props {
  columns: ToolbarColumn[];
  state: TableToolbarState;
  onChange: (s: TableToolbarState) => void;
  toolbarRight?: React.ReactNode;
  toolbarLeft?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export default function TableFrame({ columns, state, onChange, toolbarRight, toolbarLeft, className, children }: Props) {
  const hidden = useMemo(() => columns.filter(c => state.visible[c.key] === false).map(c => c.key), [columns, state.visible]);
  const hideCss = hidden.map(k => `.tf-scope [data-col="${k}"]{display:none !important;}`).join("");

  return (
    <div className={className}>
      <TableToolbar columns={columns} state={state} onChange={onChange} right={toolbarRight} left={toolbarLeft} className="mb-3" />
      {hidden.length > 0 && <style dangerouslySetInnerHTML={{ __html: hideCss }} />}
      <div
        className="tf-scope [&_th]:min-w-[var(--tf-cw)] [&_td]:min-w-[var(--tf-cw)]"
        style={{ fontSize: `${state.fontSize}px`, ["--tf-cw" as any]: `${state.defaultColWidth}px` }}
      >
        {children}
      </div>
    </div>
  );
}

export { defaultTableState };
export type { TableToolbarState, ToolbarColumn };

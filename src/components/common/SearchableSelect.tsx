import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
  group?: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: SearchableOption[] | string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
}

const normalize = (o: SearchableOption | string): SearchableOption =>
  typeof o === "string" ? { value: o, label: o } : o;

const SearchableSelect = ({ value, onChange, options, placeholder = "Seçin", disabled, className = "", allowClear = false }: Props) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const opts = useMemo(() => options.map(normalize), [options]);
  const filtered = useMemo(() => {
    const lower = q.toLowerCase();
    return opts.filter(o => o.label.toLowerCase().includes(lower));
  }, [opts, q]);

  const current = opts.find(o => o.value === value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full min-h-[38px] px-3 py-2 text-sm border border-border rounded-lg bg-background flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={current ? "text-foreground truncate" : "text-muted-foreground truncate"}>{current?.label || placeholder}</span>
        <div className="flex items-center gap-1 shrink-0">
          {allowClear && current && (
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" onClick={e => { e.stopPropagation(); onChange(""); }} />
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Axtar..."
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-border rounded bg-background"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground text-center">Nəticə yoxdur</div>
            ) : (
              filtered.map(o => (
                <div
                  key={o.value}
                  onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                  className={`px-3 py-1.5 text-sm cursor-pointer flex items-center justify-between hover:bg-secondary ${o.value === value ? "bg-primary/5" : ""}`}
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;

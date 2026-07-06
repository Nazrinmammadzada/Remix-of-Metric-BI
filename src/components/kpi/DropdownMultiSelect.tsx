import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

interface Props {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  onChange?: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}

const DropdownMultiSelect = ({ options, selected, onToggle, onChange, placeholder = "Seçin", searchPlaceholder = "Axtar..." }: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const allSelected = filtered.length > 0 && filtered.every(o => selected.includes(o));
  const toggleAll = () => {
    if (!onChange) {
      filtered.forEach(o => {
        const isSel = selected.includes(o);
        if (allSelected && isSel) onToggle(o);
        else if (!allSelected && !isSel) onToggle(o);
      });
      return;
    }
    if (allSelected) onChange(selected.filter(v => !filtered.includes(v)));
    else onChange(Array.from(new Set([...selected, ...filtered])));
  };

  return (
    <div className="relative mt-1" ref={ref}>
      <div onClick={() => setOpen(!open)} className="w-full min-h-[38px] px-3 py-2 text-sm border border-border rounded-lg bg-background cursor-pointer flex items-center justify-between">
        <span className={selected.length ? "text-foreground" : "text-muted-foreground"}>
          {selected.length ? `${selected.length} seçildi` : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
          <div className="p-2 border-b border-border flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded bg-background focus:outline-none" onClick={(e) => e.stopPropagation()} />
            </div>
            <button
              type="button"
              aria-label="Dropdown-u bağla"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
              className="h-8 w-8 rounded-md border border-border bg-background flex items-center justify-center hover:bg-secondary"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((o) => {
              const checked = selected.includes(o);
              return (
                <div key={o} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(o); }} className={`px-3 py-2 text-sm cursor-pointer flex items-center gap-2 hover:bg-secondary ${checked ? "bg-primary/5" : ""}`}>
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>
                    {checked && <Check className="w-3 h-3" />}
                  </span>
                  <span className="truncate flex-1">{o}</span>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground text-center">Tapılmadı</p>}
          </div>
          <div className="flex items-center justify-between px-2 py-1 border-t border-border">
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleAll(); }} className="text-[11px] text-primary hover:underline px-1 font-medium">
              {allSelected ? "Seçimləri sıfırla" : "Hamısını seç"}
            </button>
            <span className="text-[11px] text-muted-foreground">{selected.length} seçildi</span>
          </div>
        </div>
      )}
      {selected.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
              {s}<X className="w-3 h-3 cursor-pointer" onClick={() => onToggle(s)} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMultiSelect;

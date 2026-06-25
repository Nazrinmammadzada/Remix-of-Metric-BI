import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Cədvəl sütun başlığı: 🔍 + sütun adı yan-yana.
 * İkonaya basıldıqda ALTDA input görünür; Escape və ya təkrar kliklə bağlanır + filter sıfırlanır.
 * Sütun adı heç vaxt gizlənmir.
 */
const ColumnSearchHeader = ({ label, value, onChange, placeholder = "Dəyər daxil edin...", className = "" }: Props) => {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => { setOpen(false); onChange(""); };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => open ? close() : setOpen(true)}
          className={`p-0.5 rounded transition-colors ${open || value ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          title={open ? "Bağla və sıfırla" : "Sütun üzrə axtar"}
        >
          <Search className="w-3.5 h-3.5" />
        </button>
        <span className="truncate">{label}</span>
      </div>
      {open && (
        <div className="relative">
          <input
            ref={inputRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Escape") close(); }}
            placeholder={placeholder}
            className="w-full px-2 py-1 pr-6 text-[11px] font-normal normal-case border border-border rounded bg-background text-foreground"
          />
          {value && (
            <button onClick={() => onChange("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ColumnSearchHeader;

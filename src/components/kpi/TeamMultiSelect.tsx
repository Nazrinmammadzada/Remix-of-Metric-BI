import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown, Check, X, Users } from "lucide-react";
import { getTeams, type Team } from "@/lib/teamsStore";

interface Props {
  value: number[]; // selected team IDs
  onChange: (ids: number[]) => void;
  shared: boolean;
  onSharedChange: (shared: boolean) => void;
}

const TeamMultiSelect = ({ value, onChange, shared, onSharedChange }: Props) => {
  const [teams, setTeams] = useState<Team[]>(() => getTeams());
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => setTeams(getTeams());
    window.addEventListener("teams-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("teams-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const toggle = (id: number) => {
    const next = value.includes(id) ? value.filter((x) => x !== id) : [...value, id];
    onChange(next);
    if (next.length < 2 && shared) onSharedChange(false);
    requestAnimationFrame(() => setOpen(true));
  };

  const filtered = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.leader.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedTeams = teams.filter((t) => value.includes(t.id));

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Komanda</label>

      <div className="relative" ref={ref}>
        <div
          onClick={() => setOpen(!open)}
          className="w-full min-h-[38px] px-3 py-2 text-sm border border-border rounded-lg bg-background cursor-pointer flex items-center justify-between"
        >
          <span className={value.length ? "text-foreground" : "text-muted-foreground"}>
            {value.length ? `${value.length} komanda seçildi` : "Komanda seçin"}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>

        {open && (
          <div data-multiselect-content className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Komanda axtar..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                  Komanda tapılmadı
                </p>
              )}
              {filtered.map((t) => {
                const checked = value.includes(t.id);
                return (
                  <div
                    key={t.id}
                    data-multiselect-option
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(t.id);
                    }}
                    className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-secondary ${checked ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">
                        {t.leaderAvatar}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{t.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{t.leader}</p>
                      </div>
                    </div>
                    {checked && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                  </div>
                );
              })}
            </div>
            <div className="p-2 border-t border-border flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground">{value.length} seçildi</span>
              <button type="button" onClick={() => { setOpen(false); setSearch(""); }} className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground">Bağla</button>
            </div>
          </div>
        )}
      </div>

      {selectedTeams.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTeams.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full"
            >
              {t.name}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => toggle(t.id)}
              />
            </span>
          ))}
        </div>
      )}

      {value.length >= 2 && (
        <button
          type="button"
          onClick={() => onSharedChange(!shared)}
          className={`w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
            shared
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-card text-foreground border-border hover:bg-secondary"
          }`}
        >
          <Users className="w-4 h-4" />
          {shared
            ? `Müştərək KPI aktiv — ${value.length} komanda üçün ortaq`
            : "Müştərək (Shared KPI) et"}
        </button>
      )}
    </div>
  );
};

export default TeamMultiSelect;

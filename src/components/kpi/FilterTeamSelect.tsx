import { useEffect, useRef, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { getTeams, type Team } from "@/lib/teamsStore";

interface Props {
  value: number | null;
  onChange: (id: number | null) => void;
}

const FilterTeamSelect = ({ value, onChange }: Props) => {
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
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = teams.find((t) => t.id === value);
  const filtered = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.leader.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="relative mt-1" ref={ref}>
      <div
        onClick={() => setOpen(!open)}
        className="w-full min-h-[38px] px-3 py-2 text-sm border border-border rounded-lg bg-background cursor-pointer flex items-center justify-between"
      >
        <span className={selected ? "text-foreground truncate" : "text-muted-foreground"}>
          {selected ? selected.name : "Hamısı"}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Komanda axtar..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded bg-background focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            <div
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-secondary ${value === null ? "bg-primary/5 font-medium" : ""}`}
            >
              Hamısı
            </div>
            {filtered.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  onChange(t.id);
                  setOpen(false);
                }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-secondary ${value === t.id ? "bg-primary/5 font-medium" : ""}`}
              >
                <p className="truncate">{t.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{t.leader}</p>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground text-center">Komanda tapılmadı</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterTeamSelect;

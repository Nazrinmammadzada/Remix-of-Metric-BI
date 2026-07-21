// Rəhbəri dəyiş dialoqu — struktur vahidinin rəhbərini yeni aktiv əməkdaş ilə əvəz edir.
// Dialoq yalnız Aktiv əməkdaşları siyahıda göstərir; Passiv əməkdaşlar seçilə bilməz.
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Crown, Search, ChevronDown, Check } from "lucide-react";
import { getEmployees, getAssignedEmployeeIds, type LeaderStructInfo } from "@/lib/orgStore";
import { assignSlotInCloud } from "@/lib/orgService";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  info: LeaderStructInfo | null;
  /** Köhnə rəhbərin əməkdaş id-si — siyahıdan çıxarılır */
  currentLeaderId: number;
  onSaved: () => void;
}

const ChangeLeaderDialog = ({ open, onOpenChange, info, currentLeaderId, onSaved }: Props) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const employees = getEmployees();
  const currentLeader = employees.find(e => e.id === currentLeaderId);
  const assignedIds = useMemo(() => getAssignedEmployeeIds(), [open]);

  // Yalnız Aktiv əməkdaşlar. Artıq başqa ştatda olanları göstərmirik ki, ikiqat təyinat yaranmasın.
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter(e => {
      if (!e.active) return false;
      if (e.id === currentLeaderId) return false;
      if (assignedIds.has(e.id)) return false;
      if (!q) return true;
      return `${e.firstName} ${e.lastName} ${e.fatherName || ""} ${e.fin}`.toLowerCase().includes(q);
    });
  }, [employees, assignedIds, currentLeaderId, search]);

  const selected = selectedId != null ? employees.find(e => e.id === selectedId) : null;

  const handleClose = (o: boolean) => {
    if (!o) { setSelectedId(null); setSearch(""); setPickerOpen(false); }
    onOpenChange(o);
  };

  const handleConfirm = async () => {
    if (!info || selectedId == null) return;
    setSaving(true);
    try {
      await assignSlotInCloud(info.slotId, { employeeId: selectedId });
      setSelectedId(null);
      setSearch("");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rəhbər dəyişikliyi database-ə yazılmadı.");
    } finally {
      setSaving(false);
    }
  };

  if (!info) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Rəhbəri dəyiş — {info.node.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1">
            <div className="text-[11px] uppercase text-muted-foreground tracking-wide">Struktur</div>
            <div className="text-foreground font-medium">
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary mr-1.5">{info.node.type}</span>
              {info.node.name}
            </div>
            <div className="text-[11px] text-muted-foreground pt-1">Vəzifə: <span className="text-foreground">{info.positionName}</span></div>
            <div className="text-[11px] text-muted-foreground">
              Mövcud rəhbər: <span className="text-foreground font-medium">
                {currentLeader ? `${currentLeader.firstName} ${currentLeader.lastName}` : "—"}
              </span>
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase text-muted-foreground tracking-wide">Yeni rəhbər *</label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button className="mt-1 w-full text-left px-3 py-2 text-sm border border-border rounded-lg bg-background hover:bg-secondary/30 flex items-center justify-between gap-2">
                  <span className={selected ? "text-foreground truncate" : "text-muted-foreground truncate"}>
                    {selected ? `${selected.firstName} ${selected.lastName}` : "Aktiv əməkdaş seçin"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" sideOffset={4} className="p-0 w-[--radix-popover-trigger-width] min-w-[320px]">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      autoFocus
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Ad, soyad və ya FİN ilə axtar..."
                      className="w-full pl-8 pr-2 py-2 text-sm border border-border rounded-md bg-background focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {candidates.length === 0 && (
                    <p className="px-3 py-6 text-xs text-muted-foreground text-center">Uyğun aktiv əməkdaş tapılmadı</p>
                  )}
                  {candidates.map(e => (
                    <button
                      key={e.id}
                      onClick={() => { setSelectedId(e.id); setPickerOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-secondary/40 flex items-center justify-between gap-3 ${e.id === selectedId ? "bg-primary/5" : ""}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground truncate">{e.firstName} {e.lastName}{e.fatherName ? ` ${e.fatherName}` : ""}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">FİN: {e.fin}{e.positionName ? ` · ${e.positionName}` : ""}</p>
                      </div>
                      {e.id === selectedId && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-[11px] text-muted-foreground mt-1">
              Yalnız Aktiv və hazırda başqa ştatda olmayan əməkdaşlar göstərilir.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Ləğv et</Button>
          <Button onClick={handleConfirm} disabled={selectedId == null || saving}>{saving ? "Yazılır..." : "Təsdiq et"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeLeaderDialog;

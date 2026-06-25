import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Network, Plus, Pencil, Trash2, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import SearchableSelect from "@/components/common/SearchableSelect";
import { toast } from "sonner";
import {
  useCascadeMatrices, saveCascadeMatrix, deleteCascadeMatrix,
  type CascadeMatrix, type CascadeScopeType,
} from "@/lib/cascadeMatrixStore";
import { getTeams } from "@/lib/teamsStore";
import { getEmployees } from "@/lib/orgStore";
import { getStructures, findStructureById, type OrgStructure } from "@/lib/orgStore";

const SCOPE_LABELS: Record<CascadeScopeType, string> = {
  team: "Komanda",
  structure: "Struktur",
  position: "Vəzifə",
  user: "Şəxs(lər)",
};

const SCOPE_TARGET_LABELS: Record<CascadeScopeType, string> = {
  team: "Komanda seç",
  structure: "Struktur seç",
  position: "Vəzifə seç",
  user: "Şəxs(lər) seç",
};

const CascadeMatrixPage = () => {
  const matrices = useCascadeMatrices();
  const [editing, setEditing] = useState<CascadeMatrix | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<CascadeMatrix | null>(null);

  const teams = useMemo(() => getTeams(), []);
  const employees = useMemo(() => getEmployees(), []);
  const positions = useMemo(() => Array.from(new Set(employees.map(e => e.positionName).filter(Boolean) as string[])), [employees]);
  const userNames = useMemo(() => employees.map(e => `${e.firstName} ${e.lastName}`), [employees]);
  const structures = useMemo(() => getStructures(), []);

  return (
    <div className="min-h-screen">
      <Header title="Cascade Matrisi" />
      <main className="p-6 pb-24">
        <PageHero
          badge="Cascade Matrisi"
          icon={Network}
          title="Cascade Matrisi"
          subtitle="Komanda, struktur, vəzifə və ya şəxs üçün hədəfin paylaşılacağı şəxslərin matrisi"
          right={
            <Button onClick={() => { setEditing(null); setCreating(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Yeni Matris
            </Button>
          }
        />

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Ad</th>
                <th className="px-4 py-3 font-medium">Tətbiq sahəsi</th>
                <th className="px-4 py-3 font-medium">Hədəf</th>
                <th className="px-4 py-3 font-medium">Paylaşılan şəxslər</th>
                <th className="px-4 py-3 font-medium w-32 text-right">Əməliyyat</th>
              </tr>
            </thead>
            <tbody>
              {matrices.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">Hələ matris yaradılmayıb</td></tr>
              ) : matrices.map(m => (
                <tr key={m.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="px-4 py-2.5 font-medium text-foreground">{m.name}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary border border-primary/20">{SCOPE_LABELS[m.scopeType]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-foreground">{m.scopeName || "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {m.sharedPersons.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[11px] bg-secondary text-foreground">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => { setEditing(m); setCreating(true); }} className="p-1.5 rounded hover:bg-secondary text-primary" title="Redaktə">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setToDelete(m)} className="p-1.5 rounded hover:bg-secondary text-destructive" title="Sil">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {creating && (
        <CascadeMatrixDialog
          open={creating}
          onClose={() => { setCreating(false); setEditing(null); }}
          initial={editing}
          teams={teams.map(t => t.name)}
          structures={structures}
          positions={positions}
          users={userNames}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Matrisi silmək?</AlertDialogTitle>
            <AlertDialogDescription>"{toDelete?.name}" matrisi silinəcək.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ləğv et</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (toDelete) { deleteCascadeMatrix(toDelete.id); toast.success("Silindi"); setToDelete(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const CascadeMatrixDialog = ({
  open, onClose, initial, teams, structures, positions, users,
}: {
  open: boolean; onClose: () => void; initial: CascadeMatrix | null;
  teams: string[]; structures: OrgStructure[]; positions: string[]; users: string[];
}) => {
  const [name, setName] = useState(initial?.name ?? "");
  const [scopeType, setScopeType] = useState<CascadeScopeType>(initial?.scopeType ?? "team");
  const [scopeName, setScopeName] = useState(initial?.scopeName ?? "");
  const [structurePath, setStructurePath] = useState<number[]>([]);
  const [openStructLevel, setOpenStructLevel] = useState<number | null>(null);
  const [sharedPersons, setSharedPersons] = useState<string[]>(initial?.sharedPersons ?? []);
  const [newPerson, setNewPerson] = useState("");

  const getStructuresAtLevel = (level: number): OrgStructure[] => {
    if (level === 0) return structures;
    const parentId = structurePath[level - 1];
    if (!parentId) return [];
    const parent = findStructureById(parentId);
    return parent ? parent.children : [];
  };
  const visibleStructLevels = (() => {
    const levels: number[] = [0];
    for (let i = 0; i < structurePath.length; i++) {
      const node = findStructureById(structurePath[i]);
      if (node && node.children.length > 0) levels.push(i + 1);
    }
    return levels;
  })();

  const selectStructLevel = (level: number, id: number) => {
    const next = structurePath.slice(0, level);
    next[level] = id;
    setStructurePath(next);
    const node = findStructureById(id);
    if (node) setScopeName(node.name);
    setOpenStructLevel(null);
  };

  const scopeOptions = scopeType === "team" ? teams : scopeType === "position" ? positions : users;

  const addPerson = () => {
    if (!newPerson || sharedPersons.includes(newPerson)) return;
    setSharedPersons(p => [...p, newPerson]);
    setNewPerson("");
  };

  const submit = () => {
    if (!name.trim() || !scopeName || sharedPersons.length === 0) {
      toast.error("Ad, tətbiq sahəsi və ən azı 1 paylaşılan şəxs tələb olunur");
      return;
    }
    saveCascadeMatrix({ id: initial?.id, name: name.trim(), scopeType, scopeName, sharedPersons });
    toast.success(initial ? "Yeniləndi" : "Yaradıldı");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? "Cascade matrisini redaktə et" : "Yeni Cascade matrisi"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Ad</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Məs: Satış komandası cascade" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Tətbiq sahəsi</label>
              <SearchableSelect
                value={scopeType}
                onChange={(v) => { setScopeType(v as CascadeScopeType); setScopeName(""); setStructurePath([]); }}
                options={(Object.keys(SCOPE_LABELS) as CascadeScopeType[]).map(k => ({ value: k, label: SCOPE_LABELS[k] }))}
              />
            </div>
            {scopeType !== "structure" && scopeType !== "user" && (
              <div>
                <label className="text-xs text-muted-foreground">{SCOPE_TARGET_LABELS[scopeType]}</label>
                <SearchableSelect value={scopeName} onChange={setScopeName} options={scopeOptions} placeholder="Seçin" />
              </div>
            )}
            {scopeType === "user" && (
              <div>
                <label className="text-xs text-muted-foreground">{SCOPE_TARGET_LABELS.user}</label>
                <UserMultiSelect users={users} value={scopeName} onChange={setScopeName} />
              </div>
            )}
          </div>

          {scopeType === "structure" && (
            <div className="p-3 rounded-lg border border-border bg-secondary/40 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Struktur seçimi</label>
                {structurePath.length > 0 && (
                  <button type="button" onClick={() => { setStructurePath([]); setScopeName(""); }} className="text-[11px] text-primary hover:underline">Təmizlə</button>
                )}
              </div>
              {structures.length === 0 ? (
                <p className="text-xs text-muted-foreground">Təşkilat modulunda hələ struktur yaradılmayıb.</p>
              ) : (
                <div className="space-y-2">
                  {visibleStructLevels.map(level => {
                    const options = getStructuresAtLevel(level);
                    if (options.length === 0) return null;
                    const selectedAtLevel = structurePath[level] ?? null;
                    const selectedNode = selectedAtLevel ? options.find(o => o.id === selectedAtLevel) : null;
                    const isOpen = openStructLevel === level;
                    const labelText = level === 0 ? "Əsas struktur" : `Alt struktur (səviyyə ${level + 1})`;
                    return (
                      <div key={level} className="relative">
                        <label className="text-xs font-medium text-foreground mb-1 block">{labelText}</label>
                        <div
                          onClick={() => setOpenStructLevel(isOpen ? null : level)}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background cursor-pointer flex items-center justify-between"
                        >
                          <span className={selectedNode ? "text-foreground" : "text-muted-foreground"}>
                            {selectedNode ? selectedNode.name : "Seçin..."}
                          </span>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                        {isOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                            {options.map(o => (
                              <div key={o.id}
                                onClick={() => selectStructLevel(level, o.id)}
                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-secondary ${selectedAtLevel === o.id ? 'bg-primary/5' : ''}`}>
                                {o.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="border border-border rounded-lg p-3 space-y-2">
            <div className="text-sm font-medium">Paylaşılan şəxslər</div>
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableSelect value={newPerson} onChange={setNewPerson} options={users.filter(u => !sharedPersons.includes(u))} placeholder="Şəxs seçin" />
              </div>
              <Button onClick={addPerson} type="button"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {sharedPersons.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-sm">
                  {p}
                  <button onClick={() => setSharedPersons(arr => arr.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {sharedPersons.length === 0 && <span className="text-xs text-muted-foreground">Hələ şəxs əlavə olunmayıb</span>}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Ləğv et</Button>
            <Button onClick={submit}>Yadda saxla</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const UserMultiSelect = ({ users, value, onChange }: { users: string[]; value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = value ? value.split(",").map(s => s.trim()).filter(Boolean) : [];
  const toggle = (u: string) => {
    const next = selected.includes(u) ? selected.filter(x => x !== u) : [...selected, u];
    onChange(next.join(", "));
  };
  const filtered = users.filter(u => u.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm border border-border rounded-lg bg-background hover:bg-secondary/40">
        <span className={selected.length === 0 ? "text-muted-foreground" : "text-foreground"}>
          {selected.length === 0 ? "Şəxs(lər) seçin" : `${selected.length} şəxs seçilib`}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Axtar..." className="h-8 text-sm" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map(u => (
              <label key={u} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/60 cursor-pointer">
                <input type="checkbox" checked={selected.includes(u)} onChange={() => toggle(u)} className="w-4 h-4 accent-primary" />
                <span>{u}</span>
              </label>
            ))}
            {filtered.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">Tapılmadı</p>}
          </div>
        </div>
      )}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground text-[11px]">
              {s}
              <button type="button" onClick={() => toggle(s)} className="text-muted-foreground hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CascadeMatrixPage;

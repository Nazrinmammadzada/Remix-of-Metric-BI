import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, ChevronDown, Info, Check, Search,
  Loader2, CircleCheck, Folder, FolderOpen, Users, Building2, Briefcase, User, Globe,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { getFormulas } from "@/lib/formulasStore";
import { getEmployees, getStructures, type OrgStructure } from "@/lib/orgStore";
import { getTeams } from "@/lib/teamsStore";
import { upsertAssignmentForFormula, type FormulaTargetType, type FormulaTargetRef } from "@/lib/formulaAssignmentsStore";
import { toast } from "sonner";

// --------- helpers to derive real-data lists ---------

const collectPositions = (nodes: OrgStructure[]): { key: string; name: string }[] => {
  const map = new Map<string, string>();
  const walk = (list: OrgStructure[]) => {
    for (const n of list) {
      for (const p of n.positions) if (!map.has(p.name)) map.set(p.name, p.name);
      walk(n.children);
    }
  };
  walk(nodes);
  return Array.from(map.values()).map(name => ({ key: name, name }));
};

const collectStructures = (nodes: OrgStructure[]): { id: number; name: string; path: string; depth: number; hasChildren: boolean; parentId: number | null }[] => {
  const out: { id: number; name: string; path: string; depth: number; hasChildren: boolean; parentId: number | null }[] = [];
  const walk = (list: OrgStructure[], parentId: number | null, parts: string[], depth: number) => {
    for (const n of list) {
      const path = [...parts, n.name].join(" › ");
      out.push({ id: n.id, name: n.name, path, depth, hasChildren: n.children.length > 0, parentId });
      walk(n.children, n.id, [...parts, n.name], depth + 1);
    }
  };
  walk(nodes, null, [], 0);
  return out;
};

const collectEmployeeIdsForTargets = (
  targets: FormulaTargetRef[],
): number[] => {
  const employees = getEmployees();
  const structures = getStructures();
  const teams = getTeams();
  const ids = new Set<number>();

  const structIndex = collectStructures(structures);
  const descendants = (rootId: number): Set<number> => {
    const set = new Set<number>([rootId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of structIndex) {
        if (n.parentId != null && set.has(n.parentId) && !set.has(n.id)) { set.add(n.id); changed = true; }
      }
    }
    return set;
  };
  const empByStructure = (rootId: number) => {
    const structPaths = new Set<string>();
    const desc = descendants(rootId);
    for (const s of structIndex) if (desc.has(s.id)) structPaths.add(s.path);
    for (const e of employees) {
      if (e.structurePath && Array.from(structPaths).some(p => e.structurePath === p || e.structurePath!.startsWith(p + " › "))) ids.add(e.id);
    }
  };

  for (const t of targets) {
    if (t.type === "sexs") ids.add(Number(t.id));
    else if (t.type === "vezife") {
      const name = String(t.name);
      for (const e of employees) if (e.positionName === name) ids.add(e.id);
    } else if (t.type === "struktur") empByStructure(Number(t.id));
    else if (t.type === "komanda") {
      const team = teams.find(tm => tm.id === Number(t.id));
      if (team) {
        for (const m of team.members) {
          const emp = employees.find(e => `${e.firstName} ${e.lastName}` === m.name);
          if (emp) ids.add(emp.id);
        }
      }
    }
  }
  return Array.from(ids);
};

// --------- tree ---------
const TreeItem = ({
  node, level, selectedIds, toggle, expanded, toggleExpand,
}: {
  node: ReturnType<typeof collectStructures>[number] & { children: number[] };
  level: number;
  selectedIds: Set<number>;
  toggle: (id: number) => void;
  expanded: Record<number, boolean>;
  toggleExpand: (id: number) => void;
}) => {
  const open = !!expanded[node.id];
  const selected = selectedIds.has(node.id);
  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-sm ${selected ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-secondary/50"}`}
        style={{ paddingLeft: 8 + level * 16 }}
      >
        {node.hasChildren ? (
          <button onClick={() => toggleExpand(node.id)}>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
          </button>
        ) : <span className="w-3.5" />}
        <input type="checkbox" checked={selected} onChange={() => toggle(node.id)} className="w-3.5 h-3.5 accent-blue-600" />
        {node.hasChildren ? (open ? <FolderOpen className="w-4 h-4 text-blue-500" /> : <Folder className="w-4 h-4 text-muted-foreground" />) : <Folder className="w-4 h-4 text-muted-foreground" />}
        <span className="cursor-pointer" onClick={() => toggle(node.id)}>{node.name}</span>
      </div>
    </div>
  );
};

// --------- checkbox list with search + scroll ---------
function CheckboxList<T extends { id: string | number; name: string; sub?: string }>({
  items, selected, toggle, placeholder,
}: { items: T[]; selected: Set<string | number>; toggle: (id: string | number, name: string) => void; placeholder: string }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => q ? items.filter(i => i.name.toLowerCase().includes(q.toLowerCase()) || (i.sub ?? "").toLowerCase().includes(q.toLowerCase())) : items, [items, q]);
  return (
    <div className="border border-border rounded-lg bg-background">
      <div className="relative border-b border-border">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} className="w-full pl-8 pr-3 py-2 text-sm bg-transparent outline-none" />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.length === 0 && <div className="p-3 text-xs text-muted-foreground text-center">Nəticə yoxdur</div>}
        {filtered.map(item => {
          const sel = selected.has(item.id);
          return (
            <label key={item.id} className={`flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-secondary/50 ${sel ? "bg-blue-50/60 dark:bg-blue-500/10" : ""}`}>
              <input type="checkbox" checked={sel} onChange={() => toggle(item.id, item.name)} className="w-3.5 h-3.5 accent-blue-600" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{item.name}</div>
                {item.sub && <div className="text-[11px] text-muted-foreground truncate">{item.sub}</div>}
              </div>
            </label>
          );
        })}
      </div>
      <div className="px-3 py-1.5 border-t border-border text-[11px] text-muted-foreground">
        {filtered.length} nəticə • {selected.size} seçilib
      </div>
    </div>
  );
}

const StepBadge = ({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) => (
  <div className="flex items-center gap-2 min-w-fit">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
      active ? "bg-blue-600 text-white" : done ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" : "bg-secondary text-muted-foreground"
    }`}>{done ? <Check className="w-4 h-4" /> : n}</div>
    <span className={`text-sm ${active ? "text-blue-700 dark:text-blue-300 font-medium" : "text-muted-foreground"}`}>{label}</span>
  </div>
);

const TYPE_META: Record<FormulaTargetType, { label: string; icon: typeof User }> = {
  sexs: { label: "Şəxs", icon: User },
  vezife: { label: "Vəzifə", icon: Briefcase },
  struktur: { label: "Struktur", icon: Building2 },
  komanda: { label: "Komanda", icon: Users },
};

const BulkAssignWizard = ({ onBack, onDone }: { onBack: () => void; onDone?: () => void }) => {
  const formulas = useMemo(() => getFormulas(), []);
  const [step, setStep] = useState(1);
  const [formulaId, setFormulaId] = useState<number>(formulas[0]?.id);
  const [types, setTypes] = useState<FormulaTargetType[]>(["struktur"]);
  const [selPersons, setSelPersons] = useState<Set<string | number>>(new Set());
  const [selPositions, setSelPositions] = useState<Set<string | number>>(new Set());
  const [selStructures, setSelStructures] = useState<Set<string | number>>(new Set());
  const [selTeams, setSelTeams] = useState<Set<string | number>>(new Set());
  const [selNames, setSelNames] = useState<Record<string, string>>({});
  const [expandedTree, setExpandedTree] = useState<Record<number, boolean>>({});
  const [progress, setProgress] = useState(0);

  const selectedFormula = formulas.find(f => f.id === formulaId);
  const employees = useMemo(() => getEmployees(), []);
  const positions = useMemo(() => collectPositions(getStructures()), []);
  const structuresFlat = useMemo(() => collectStructures(getStructures()), []);
  const teams = useMemo(() => getTeams(), []);

  const toggleType = (t: FormulaTargetType) => {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const toggleFromSet = (
    setter: React.Dispatch<React.SetStateAction<Set<string | number>>>,
    prefix: string,
  ) => (id: string | number, name: string) => {
    setter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelNames(prev => ({ ...prev, [`${prefix}:${id}`]: name }));
  };

  const targets: FormulaTargetRef[] = useMemo(() => {
    const out: FormulaTargetRef[] = [];
    selPersons.forEach(id => out.push({ type: "sexs", id, name: selNames[`sexs:${id}`] ?? String(id) }));
    selPositions.forEach(id => out.push({ type: "vezife", id, name: selNames[`vezife:${id}`] ?? String(id) }));
    selStructures.forEach(id => out.push({ type: "struktur", id, name: selNames[`struktur:${id}`] ?? String(id) }));
    selTeams.forEach(id => out.push({ type: "komanda", id, name: selNames[`komanda:${id}`] ?? String(id) }));
    return out;
  }, [selPersons, selPositions, selStructures, selTeams, selNames]);

  const employeeIds = useMemo(() => collectEmployeeIdsForTargets(targets), [targets]);
  const totalCount = employeeIds.length;

  useEffect(() => {
    if (step !== 3) return;
    setProgress(0);
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(iv); setTimeout(() => finalize(), 300); return 100; }
        return p + 5;
      });
    }, 60);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const finalize = () => {
    if (!selectedFormula) return;
    addAssignment({
      formulaId: selectedFormula.id,
      formulaName: selectedFormula.name,
      variables: selectedFormula.variables ?? [],
      targetTypes: types,
      targets,
      employeeIds,
      status: "active",
    });
    toast.success(`${totalCount} əməkdaşa düstur təyin olundu`);
    onDone?.();
    onBack();
  };

  const canNextStep1 = !!selectedFormula && types.length > 0 && targets.length > 0;

  return (
    <div className="min-h-screen">
      <Header title="Hesablama" />
      <main className="p-6 pb-24 max-w-[1400px] mx-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-3 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40">
              <ChevronLeft className="w-4 h-4" /> Geri
            </button>
            <h1 className="text-2xl font-semibold text-foreground">Düstur təyin et</h1>
            <p className="text-sm text-muted-foreground mt-1">Düsturu seçin və tətbiq olunacaq hədəf kütləni müəyyən edin.</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="bg-card rounded-xl border border-border shadow-sm px-6 py-4 mb-6">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {[
              { n: 1, l: "Düstur və tətbiq sahəsi seçimi" },
              { n: 2, l: "Ön baxış" },
              { n: 3, l: "Yaradılma" },
              { n: 4, l: "Nəticə" },
            ].map((s, i, arr) => (
              <div key={s.n} className="flex items-center gap-3 flex-1">
                <StepBadge n={s.n} label={s.l} active={step === s.n} done={step > s.n} />
                {i < arr.length - 1 && <div className={`flex-1 h-px ${step > s.n ? "bg-blue-500" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formula card */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-6 lg:col-span-1">
                <h3 className="text-base font-semibold text-foreground mb-4">Düsturun seçilməsi</h3>
                <label className="text-xs font-medium text-muted-foreground">Düstur <span className="text-destructive">*</span></label>
                <div className="relative mt-1">
                  <select value={formulaId} onChange={e => setFormulaId(Number(e.target.value))} className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border border-border rounded-lg bg-background">
                    {formulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                {selectedFormula && (
                  <div className="mt-4 space-y-2">
                    <div className="rounded-lg bg-secondary/40 border border-border p-3">
                      <div className="text-[11px] text-muted-foreground mb-1">Formula</div>
                      <div className="font-mono text-xs">{selectedFormula.formula}</div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedFormula.variables.map(v => (
                        <span key={v} className="px-2 py-0.5 text-[11px] rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{v}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 p-3">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                    Aktiv versiya avtomatik istifadə olunur.
                  </p>
                </div>
              </div>

              {/* Types + targets */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-6 lg:col-span-2">
                <h3 className="text-base font-semibold text-foreground mb-1">Təyinat tipi</h3>
                <p className="text-xs text-muted-foreground mb-3">Bir və ya bir neçə seçim edin</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {(Object.keys(TYPE_META) as FormulaTargetType[]).map(t => {
                    const active = types.includes(t);
                    const Icon = TYPE_META[t].icon;
                    return (
                      <button key={t} onClick={() => toggleType(t)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition ${active ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-card hover:bg-secondary/40"}`}>
                        <Icon className="w-3.5 h-3.5" /> {TYPE_META[t].label}
                      </button>
                    );
                  })}
                </div>

                <h3 className="text-base font-semibold text-foreground mb-3">Tətbiq sahəsi</h3>
                {types.length === 0 && (
                  <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">
                    Tətbiq sahəsini görmək üçün ən azı bir təyinat tipi seçin.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {types.includes("sexs") && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Şəxs</div>
                      <CheckboxList
                        items={employees.filter(e => e.active).map(e => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, sub: e.positionName || "—" }))}
                        selected={selPersons}
                        toggle={toggleFromSet(setSelPersons, "sexs")}
                        placeholder="Əməkdaş axtar..."
                      />
                    </div>
                  )}
                  {types.includes("vezife") && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Vəzifə</div>
                      <CheckboxList
                        items={positions.map(p => ({ id: p.key, name: p.name }))}
                        selected={selPositions}
                        toggle={toggleFromSet(setSelPositions, "vezife")}
                        placeholder="Vəzifə axtar..."
                      />
                    </div>
                  )}
                  {types.includes("struktur") && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Struktur</div>
                      <div className="border border-border rounded-lg bg-background max-h-72 overflow-y-auto p-1">
                        {structuresFlat.filter(s => {
                          // hide children when parent collapsed
                          if (s.parentId == null) return true;
                          let cur = s.parentId;
                          while (cur != null) {
                            if (!expandedTree[cur]) return false;
                            const parent = structuresFlat.find(x => x.id === cur);
                            cur = parent?.parentId ?? null;
                          }
                          return true;
                        }).map(s => (
                          <TreeItem
                            key={s.id}
                            node={{ ...s, children: [] }}
                            level={s.depth}
                            selectedIds={selStructures as Set<number>}
                            toggle={(id) => toggleFromSet(setSelStructures, "struktur")(id, s.name)}
                            expanded={expandedTree}
                            toggleExpand={(id) => setExpandedTree(prev => ({ ...prev, [id]: !prev[id] }))}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {types.includes("komanda") && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Komanda</div>
                      <CheckboxList
                        items={teams.map(t => ({ id: t.id, name: t.name, sub: t.leader }))}
                        selected={selTeams}
                        toggle={toggleFromSet(setSelTeams, "komanda")}
                        placeholder="Komanda axtar..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Cəmi <span className="font-semibold text-foreground">{totalCount}</span> əməkdaş seçilib
              </div>
              <button onClick={() => setStep(2)} disabled={!canNextStep1} className="px-5 py-2.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 inline-flex items-center gap-2 disabled:opacity-50">
                Növbəti: Ön baxış <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h3 className="text-base font-semibold text-foreground mb-5">Ön baxış</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 text-sm">
                <div><div className="text-xs text-muted-foreground">Seçilmiş düstur</div><div className="font-medium mt-0.5">{selectedFormula?.name}</div><div className="font-mono text-xs text-muted-foreground mt-0.5">{selectedFormula?.formula}</div></div>
                <div>
                  <div className="text-xs text-muted-foreground">Təyinat tipləri</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {types.map(t => <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{TYPE_META[t].label}</span>)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tətbiq sahəsi ({targets.length})</div>
                  <div className="flex flex-wrap gap-1 mt-1 max-h-32 overflow-y-auto">
                    {targets.map((t, i) => <span key={i} className="px-2 py-0.5 text-xs rounded-md bg-secondary text-foreground border border-border">{TYPE_META[t.type].label}: {t.name}</span>)}
                  </div>
                </div>
              </div>
              <div className="rounded-xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5 p-5 flex flex-col justify-center">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm">Bu əməliyyat nəticəsində</p>
                    <p className="text-3xl font-bold text-blue-600 my-2">{totalCount} <span className="text-sm font-normal text-foreground">əməkdaşa düstur təyin olunacaq.</span></p>
                    <p className="text-sm text-muted-foreground mt-3">Davam etmək istəyirsiniz?</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setStep(1)} className="px-5 py-2.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40">Geri</button>
              <button onClick={() => setStep(3)} disabled={totalCount === 0} className="px-6 py-2.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50">Yarat</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-8">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <h3 className="text-base font-semibold">Yaradılır...</h3>
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between mt-3 text-sm">
              <span className="font-medium">{Math.round((progress / 100) * totalCount)} / {totalCount}</span>
              <span className="text-muted-foreground">Mass təyinat gedir...</span>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
            <CircleCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-semibold">Uğurlu!</p>
            <p className="text-sm text-muted-foreground">{totalCount} əməkdaşa düstur təyin olundu.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default BulkAssignWizard;

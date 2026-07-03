import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, ChevronDown, Info, Check, Search,
  Download, Filter, Loader2, CircleCheck, Folder, FolderOpen,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { getFormulas } from "@/lib/formulasStore";

type TargetType = "sexs" | "vezife" | "struktur" | "komanda" | "sirket";

interface TreeNode { id: string; name: string; children?: TreeNode[]; }

const tree: TreeNode[] = [
  {
    id: "sirket", name: "Şirkət", children: [
      { id: "maliyye", name: "Maliyyə", children: [{ id: "muh", name: "Mühasibatlıq" }, { id: "budce", name: "Büdcə" }] },
      { id: "hr", name: "İnsan Resursları", children: [{ id: "recruit", name: "İşə Qəbul" }, { id: "learn", name: "Təlim və İnkişaf" }] },
      {
        id: "satis", name: "Satış", children: [
          { id: "daxili", name: "Daxili satış" },
          { id: "xarici", name: "Xarici satış" },
        ]
      },
      { id: "it", name: "İT", children: [{ id: "dev", name: "İnkişaf" }, { id: "ops", name: "Əməliyyat" }] },
      { id: "marketing", name: "Marketinq", children: [{ id: "digital", name: "Rəqəmsal" }, { id: "brand", name: "Brend" }] },
    ]
  }
];

const sampleEmployees = [
  { name: "Nicat Əliyev", position: "Satış meneceri" },
  { name: "Aysel Məmmədova", position: "Satış meneceri" },
  { name: "Ramil Quliyev", position: "Baş satış mütəxəssisi" },
  { name: "Günel Həsənova", position: "Satış mütəxəssisi" },
  { name: "Tural Məmmədov", position: "Satış mütəxəssisi" },
  { name: "Səbinə Əhmədova", position: "Satış mütəxəssisi" },
  { name: "Elvin Kərimov", position: "Satış mütəxəssisi" },
  { name: "Ləman Rəhimova", position: "Satış mütəxəssisi" },
  { name: "Kənan Vəliyev", position: "Satış mütəxəssisi" },
  { name: "Ayşən Bayramova", position: "Satış mütəxəssisi" },
  { name: "Orxan Süleymanov", position: "Satış mütəxəssisi" },
  { name: "Nərmin Qasımova", position: "Satış meneceri" },
];

const TreeItem = ({ node, level, selectedId, onSelect, expanded, toggle }: {
  node: TreeNode; level: number; selectedId: string; onSelect: (id: string) => void;
  expanded: Record<string, boolean>; toggle: (id: string) => void;
}) => {
  const has = !!node.children?.length;
  const open = !!expanded[node.id];
  const selected = selectedId === node.id;
  return (
    <div>
      <div
        onClick={() => { onSelect(node.id); if (has) toggle(node.id); }}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer text-sm ${selected ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "hover:bg-secondary/50 text-foreground"}`}
        style={{ paddingLeft: 8 + level * 16 }}
      >
        {has ? (
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
        ) : <span className="w-3.5" />}
        {has ? (open ? <FolderOpen className="w-4 h-4 text-blue-500" /> : <Folder className="w-4 h-4 text-muted-foreground" />)
          : <Folder className="w-4 h-4 text-muted-foreground" />}
        <span>{node.name}</span>
      </div>
      {has && open && (
        <div>
          {node.children!.map(c => (
            <TreeItem key={c.id} node={c} level={level + 1} selectedId={selectedId} onSelect={onSelect} expanded={expanded} toggle={toggle} />
          ))}
        </div>
      )}
    </div>
  );
};

const StepBadge = ({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) => (
  <div className="flex items-center gap-2 min-w-fit">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
      active ? "bg-blue-600 text-white" : done ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" : "bg-secondary text-muted-foreground"
    }`}>{done ? <Check className="w-4 h-4" /> : n}</div>
    <span className={`text-sm ${active ? "text-blue-700 dark:text-blue-300 font-medium" : "text-muted-foreground"}`}>{label}</span>
  </div>
);

const BulkAssignWizard = ({ onBack }: { onBack: () => void }) => {
  const formulas = useMemo(() => getFormulas(), []);
  const [step, setStep] = useState(1);
  const [formulaId, setFormulaId] = useState<number>(formulas.find(f => f.name.toLowerCase().includes("satış bonusu"))?.id || formulas[0]?.id);
  const [version] = useState("V1 (01.07.2026) - Aktiv");
  const [targetType, setTargetType] = useState<TargetType>("struktur");
  const [selectedNode, setSelectedNode] = useState("satis");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ sirket: true, satis: true });
  const [progress, setProgress] = useState(0);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const totalCount = 410;
  const selectedFormula = formulas.find(f => f.id === formulaId);
  const nodeName = useMemo(() => {
    const find = (nodes: TreeNode[]): string | null => {
      for (const n of nodes) {
        if (n.id === selectedNode) return n.name;
        if (n.children) { const r = find(n.children); if (r) return r; }
      }
      return null;
    };
    return find(tree) || "Satış";
  }, [selectedNode]);

  useEffect(() => {
    if (step !== 4) return;
    setProgress(0);
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(iv); setTimeout(() => setStep(5), 400); return 100; }
        return p + 4;
      });
    }, 80);
    return () => clearInterval(iv);
  }, [step]);

  const toggle = (id: string) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const created = Math.round((progress / 100) * totalCount);

  return (
    <div className="min-h-screen">
      <Header title="Hesablama" />
      <main className="p-6 pb-24 max-w-[1400px] mx-auto">
        {/* Header row */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-3 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40 text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" /> Geri
            </button>
            <h1 className="text-2xl font-semibold text-foreground">Düsturlar / Kütləvi Təyinat</h1>
            <p className="text-sm text-muted-foreground mt-1">Düsturu seçin və tətbiq olunacaq hədəf kütləni müəyyən edin.</p>
          </div>
          <button className="px-4 py-2 text-sm rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10">
            Kütləvi təyinatlar
          </button>
        </div>

        {/* Stepper */}
        <div className="bg-card rounded-xl border border-border shadow-sm px-6 py-4 mb-6">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {[
              { n: 1, l: "Düstur seçimi" },
              { n: 2, l: "Hədəf seçimi" },
              { n: 3, l: "Ön baxış" },
              { n: 4, l: "Yaradılma" },
              { n: 5, l: "Nəticə" },
            ].map((s, i, arr) => (
              <div key={s.n} className="flex items-center gap-3 flex-1">
                <StepBadge n={s.n} label={s.l} active={step === s.n} done={step > s.n} />
                {i < arr.length - 1 && <div className={`flex-1 h-px ${step > s.n ? "bg-blue-500" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Formula + Target type + Tree */}
        {step === 1 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <h3 className="text-base font-semibold text-foreground mb-4">1. Düsturun seçilməsi</h3>
                <label className="text-xs font-medium text-muted-foreground">Düstur <span className="text-destructive">*</span></label>
                <div className="relative mt-1">
                  <select value={formulaId} onChange={e => setFormulaId(Number(e.target.value))} className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border border-border rounded-lg bg-background">
                    {formulas.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                <label className="text-xs font-medium text-muted-foreground mt-4 block">Düstur versiyası</label>
                <div className="relative mt-1">
                  <select value={version} className="w-full appearance-none px-3 py-2.5 pr-9 text-sm border border-border rounded-lg bg-background">
                    <option>{version}</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 p-3">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                    Seçilmiş düstur KPI ballarına və maaş bazasına əsaslanaraq bonus məbləğini hesablayır.
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <h3 className="text-base font-semibold text-foreground mb-1">2. Təyinat tipi</h3>
                <p className="text-xs text-muted-foreground mb-4">Düstur kimlərə tətbiq olunacaq?</p>
                <div className="space-y-3">
                  {([
                    ["sexs", "Şəxs"], ["vezife", "Vəzifə"], ["struktur", "Struktur"], ["komanda", "Komanda"], ["sirket", "Bütün şirkət"],
                  ] as [TargetType, string][]).map(([id, label]) => (
                    <label key={id} className="flex items-center gap-3 cursor-pointer group">
                      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${targetType === id ? "border-blue-600" : "border-border group-hover:border-blue-400"}`}>
                        {targetType === id && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                      </span>
                      <input type="radio" checked={targetType === id} onChange={() => setTargetType(id)} className="hidden" />
                      <span className="text-sm text-foreground">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <h3 className="text-base font-semibold text-foreground mb-4">3. Hədəfin seçilməsi</h3>
                <label className="text-xs font-medium text-muted-foreground">Struktur <span className="text-destructive">*</span></label>
                <div className="mt-1 border border-border rounded-lg max-h-[280px] overflow-y-auto p-1 bg-background">
                  {tree.map(n => (
                    <TreeItem key={n.id} node={n} level={0} selectedId={selectedNode} onSelect={setSelectedNode} expanded={expanded} toggle={toggle} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setStep(3)} className="px-5 py-2.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 inline-flex items-center gap-2">
                Növbəti: Ön baxış <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            <h3 className="text-base font-semibold text-foreground mb-5">Ön baxış</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 text-sm">
                <div><div className="text-xs text-muted-foreground">Seçilmiş düstur</div><div className="font-medium text-foreground mt-0.5">{selectedFormula?.name} (V1)</div></div>
                <div><div className="text-xs text-muted-foreground">Təyinat tipi</div><div className="font-medium text-foreground mt-0.5 capitalize">{targetType === "struktur" ? "Struktur" : targetType}</div></div>
                <div><div className="text-xs text-muted-foreground">Seçilmiş struktur</div><div className="font-medium text-foreground mt-0.5">{nodeName} Departamenti</div></div>
                <div><div className="text-xs text-muted-foreground">Tapılan əməkdaş sayı</div><div className="font-semibold text-blue-600 mt-0.5 text-lg">{totalCount} nəfər</div></div>
              </div>
              <div className="rounded-xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5 p-5 flex flex-col justify-center">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground">Bu əməliyyat nəticəsində</p>
                    <p className="text-3xl font-bold text-blue-600 my-2">{totalCount} <span className="text-sm font-normal text-foreground">yeni hesablama sətri yaradılacaq.</span></p>
                    <p className="text-sm text-muted-foreground mt-3">Davam etmək istəyirsiniz?</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setStep(1)} className="px-5 py-2.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40">Geri</button>
              <button onClick={() => setStep(4)} className="px-6 py-2.5 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700">Yarat</button>
            </div>
          </div>
        )}

        {/* Step 4: Progress */}
        {step === 4 && (
          <div className="bg-card rounded-xl border border-border shadow-sm p-8">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <h3 className="text-base font-semibold text-foreground">Yaradılır...</h3>
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between mt-3 text-sm">
              <span className="font-medium text-foreground">{created} / {totalCount}</span>
              <span className="text-muted-foreground">{totalCount} qeyddən {created} yaradıldı...</span>
            </div>
          </div>
        )}

        {/* Step 5: Results */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Təyinat nəticələri</h3>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40">
                  <Download className="w-4 h-4" /> Excel-ə ixrac
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40">
                  <Filter className="w-4 h-4" /> Filtrlər
                </button>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input placeholder="Axtar..." className="pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background w-52" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-4 py-3">
              <CircleCheck className="w-5 h-5 text-emerald-600" />
              <span className="text-sm text-emerald-800 dark:text-emerald-200"><b>{totalCount}</b> əməkdaşa uğurla düstur təyin olundu.</span>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/60 text-left text-xs text-muted-foreground">
                    <th className="w-10 px-3 py-2.5"></th>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Əməkdaş</th>
                    <th className="px-3 py-2.5">Vəzifə</th>
                    <th className="px-3 py-2.5">Struktur</th>
                    <th className="px-3 py-2.5">Düstur</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Təyin tarixi</th>
                    <th className="px-3 py-2.5">Versiya</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleEmployees.map((e, i) => (
                    <>
                      <tr key={i} className="border-t border-border hover:bg-secondary/30">
                        <td className="px-3 py-2.5">
                          <button onClick={() => setExpandedRow(expandedRow === i ? null : i)} className="p-1 rounded hover:bg-secondary">
                            <ChevronDown className={`w-4 h-4 text-blue-600 transition-transform ${expandedRow === i ? "rotate-180" : ""}`} />
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2.5 font-medium">{e.name}</td>
                        <td className="px-3 py-2.5">{e.position}</td>
                        <td className="px-3 py-2.5">{nodeName}</td>
                        <td className="px-3 py-2.5">{selectedFormula?.name}</td>
                        <td className="px-3 py-2.5"><span className="px-2 py-0.5 text-xs rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">Aktiv</span></td>
                        <td className="px-3 py-2.5">03.07.2026</td>
                        <td className="px-3 py-2.5">V1</td>
                      </tr>
                      {expandedRow === i && (
                        <tr className="bg-blue-50/40 dark:bg-blue-500/5 border-t border-border">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="text-xs text-muted-foreground mb-1">Tətbiq olunan düstur:</div>
                            <div className="font-mono text-sm bg-background border border-border rounded-md px-3 py-2 inline-block">{selectedFormula?.formula}</div>
                            <div className="mt-2 text-xs text-muted-foreground">Dəyişənlər: {selectedFormula?.variables.join(", ")}</div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
                <span className="text-muted-foreground">Cəmi: {totalCount} nəticə</span>
                <div className="flex items-center gap-1">
                  <button className="w-8 h-8 rounded border border-border hover:bg-secondary flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
                  {[1, 2, 3, 4, 5].map(p => (
                    <button key={p} className={`w-8 h-8 rounded text-xs ${p === 1 ? "bg-blue-600 text-white" : "border border-border hover:bg-secondary"}`}>{p}</button>
                  ))}
                  <span className="px-2 text-muted-foreground">...</span>
                  <button className="w-8 h-8 rounded border border-border hover:bg-secondary text-xs">41</button>
                  <button className="w-8 h-8 rounded border border-border hover:bg-secondary flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BulkAssignWizard;

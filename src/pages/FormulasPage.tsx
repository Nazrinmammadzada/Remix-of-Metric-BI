import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { Plus, Pencil, Trash2, BookOpen, X, Check, ChevronDown, ChevronLeft, Search, AlertTriangle, Sparkles } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getFormulas, saveFormulas, getVariables, type Formula, type FormulaVariable } from "@/lib/formulasStore";
import { useCatalogValues } from "@/lib/dropdownCatalogStore";
import { DataTable } from "@/components/common/DataTable";

const KPI_TYPE_DEFAULTS = ["Absolut Hədəf", "Faiz Hədəfi", "Trend Hədəfi", "Benchmark", "Say Hədəfi"];

const FormulasPage = ({ onBack }: { onBack?: () => void } = {}) => {
  const [formulas, setFormulas] = useState<Formula[]>(() => getFormulas());
  const variables_initial = getVariables();
  const kpiTypeOptions = useCatalogValues("kpi_types", KPI_TYPE_DEFAULTS);
  const [variables, setVariables] = useState<FormulaVariable[]>(() => variables_initial);

  const [showBook, setShowBook] = useState(false);
  const [bookTab, setBookTab] = useState<string>("Hamısı");
  const [varSearch, setVarSearch] = useState("");

  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Formula | null>(null);
  const [form, setForm] = useState({ name: "", description: "", kpiTypes: [] as string[], variables: [] as string[], formula: "" });
  const [showVarDropdown, setShowVarDropdown] = useState(false);
  const [showKpiTypeDropdown, setShowKpiTypeDropdown] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<Formula | null>(null);

  useEffect(() => {
    const refresh = () => { setFormulas(getFormulas()); setVariables(getVariables()); };
    window.addEventListener("formulas-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("formulas-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const persistFormulas = (next: Formula[]) => { setFormulas(next); saveFormulas(next); };

  const sources = useMemo(() => ["Hamısı", ...Array.from(new Set(variables.map(v => v.source)))], [variables]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", kpiTypes: [], variables: [], formula: "" });
    setShowDialog(true);
  };

  const openEdit = (f: Formula) => {
    toast.info("Dəyişiklik cari tarixdən etibarən qüvvəyə minir");
    setEditing(f);
    setForm({ name: f.name, description: f.description, kpiTypes: f.kpiTypes ? [...f.kpiTypes] : [], variables: [...f.variables], formula: f.formula });
    setShowDialog(true);
  };

  const toggleVar = (short: string) => {
    setForm(p => ({ ...p, variables: p.variables.includes(short) ? p.variables.filter(s => s !== short) : [...p.variables, short] }));
  };

  const toggleKpiType = (t: string) => {
    setForm(p => ({ ...p, kpiTypes: p.kpiTypes.includes(t) ? p.kpiTypes.filter(x => x !== t) : [...p.kpiTypes, t] }));
  };

  const insertToken = (token: string) => setForm(p => ({ ...p, formula: p.formula + token }));

  const save = () => {
    if (!form.name.trim() || !form.formula.trim()) {
      toast.error("Düstur adı və formula tələb olunur");
      return;
    }
    if (editing) {
      persistFormulas(formulas.map(f => f.id === editing.id ? { ...editing, ...form, kpiName: editing.kpiName } : f));
      toast.success("Düstur yeniləndi");
    } else {
      persistFormulas([...formulas, { id: Date.now(), ...form, kpiName: "" }]);
      toast.success("Düstur əlavə edildi");
    }
    setShowDialog(false);
    setEditing(null);
  };

  const handleDelete = (f: Formula) => {
    setDeleteConfirm(f);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    persistFormulas(formulas.filter(f => f.id !== deleteConfirm.id));
    toast.success("Silindi");
    setDeleteConfirm(null);
  };

  const filteredVars = variables.filter(v =>
    (bookTab === "Hamısı" || v.source === bookTab) &&
    (v.short.toLowerCase().includes(varSearch.toLowerCase()) || v.name.toLowerCase().includes(varSearch.toLowerCase()))
  );

  return (
    <div className="min-h-screen">
      <Header title="Hesablama Düsturları" />
      <main className="p-6 pb-24">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 mb-4 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40 text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
        )}
        <PageHero
          badge="Düstur Mərkəzi"
          icon={Sparkles}
          title="Hesablama Düsturları"
          subtitle="KPI-lar üçün düsturları və dəyişənləri idarə edin"
        />
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Hesablama Düsturları</h3>
            <div className="flex items-center gap-2">
              <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground">
                <Plus className="w-4 h-4" /> Düstur Əlavə Et
              </button>
              <button onClick={() => setShowBook(true)} title="Dəyişənlər Kitabı" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border bg-card hover:bg-secondary">
                <BookOpen className="w-4 h-4" />
              </button>
            </div>
          </div>
          <DataTable<Formula>
            rows={formulas}
            rowKey={(f) => f.id}
            storageKey="formulas-table"
            emptyMessage="Hələ düstur yoxdur"
            columns={[
              { key: "name", label: "Düstur Adı", filterType: "text", accessor: (f) => f.name, render: (f) => <span className="font-medium">{f.name}</span> },
              { key: "formula", label: "Formula", filterType: "text", accessor: (f) => f.formula, render: (f) => <span className="font-mono text-xs">{f.formula}</span> },
              { key: "kpi", label: "Aid KPI Tipləri", filterType: "select", selectOptions: kpiTypeOptions, accessor: (f) => (f.kpiTypes?.join(", ") || f.kpiName || ""), render: (f) => (
                <div className="flex flex-wrap gap-1">{(f.kpiTypes && f.kpiTypes.length > 0 ? f.kpiTypes : (f.kpiName ? [f.kpiName] : [])).map(t => <span key={t} className="px-2 py-0.5 text-xs bg-accent text-accent-foreground rounded-full">{t}</span>)}</div>
              ) },
              {
                key: "vars", label: "Dəyişənlər", filterType: "text", accessor: (f) => f.variables.join(", "),
                render: (f) => <div className="flex flex-wrap gap-1">{f.variables.map(v => <span key={v} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">{v}</span>)}</div>,
              },
              { key: "desc", label: "Təsvir", filterType: "text", accessor: (f) => f.description, render: (f) => <span className="text-muted-foreground text-xs">{f.description}</span> },
              {
                key: "op", label: "Əməliyyat", width: 120, align: "center", filterType: "none",
                render: (f) => (
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => openEdit(f)} className="p-1 rounded hover:bg-secondary"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => handleDelete(f)} className="p-1 rounded hover:bg-zone-red-bg"><Trash2 className="w-4 h-4 text-destructive" /></button>
                  </div>
                ),
              },
            ]}
          />

        </div>
      </main>

      {/* Variable Book Dialog (READ-ONLY, grouped by integration source) */}
      <Dialog open={showBook} onOpenChange={setShowBook}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-primary" /> Dəyişənlər Kitabı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Bu dəyişənlər inteqrasiya olunmuş sistemlərdən backenddən gəlir və yalnız oxumaq üçündür.</p>

            {(() => {
              const VISIBLE = 4;
              const visible = sources.slice(0, VISIBLE);
              const overflow = sources.slice(VISIBLE);
              const overflowActive = overflow.includes(bookTab);
              return (
                <div className="flex gap-1 border-b border-border items-center">
                  {visible.map(s => (
                    <button key={s} onClick={() => setBookTab(s)} className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${bookTab === s ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{s}</button>
                  ))}
                  {overflow.length > 0 && (
                    <div className="relative group">
                      <button className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1 ${overflowActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                        {overflowActive ? bookTab : "..."} <ChevronDown className="w-3 h-3" />
                      </button>
                      <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block bg-card border border-border rounded-lg shadow-lg min-w-[180px] py-1">
                        {overflow.map(s => (
                          <button
                            key={s}
                            onClick={() => setBookTab(s)}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors ${bookTab === s ? "bg-primary/10 text-primary" : "text-foreground"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={varSearch} onChange={e => setVarSearch(e.target.value)} placeholder="Axtar..." className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded bg-background" />
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-secondary/50 text-muted-foreground text-left"><th className="px-3 py-2">Qısaltma</th><th className="px-3 py-2">Adı</th><th className="px-3 py-2">İzahı</th><th className="px-3 py-2">Mənbə</th></tr></thead>
                <tbody>
                  {filteredVars.map(v => (
                    <tr key={v.id} className="border-t border-border">
                      <td className="px-3 py-2"><span className="px-2 py-0.5 text-xs font-mono bg-primary/10 text-primary rounded">{v.short}</span></td>
                      <td className="px-3 py-2 font-medium">{v.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{v.description}</td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 text-[11px] rounded-full bg-accent text-accent-foreground">{v.source}</span></td>
                    </tr>
                  ))}
                  {filteredVars.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">Nəticə yoxdur</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Formula Dialog */}
      <Dialog open={showDialog} onOpenChange={() => { setShowDialog(false); setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Düsturu Redaktə Et" : "Yeni Düstur Əlavə Et"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><label className="text-sm font-medium">Düstur Adı</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Satış Performans Düsturu" className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background" /></div>
            <div><label className="text-sm font-medium">Təsvir</label><input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Düsturun təsviri..." className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background" /></div>
            <div>
              <label className="text-sm font-medium">Aid Olduğu KPI Tipləri</label>
              <div className="relative mt-1">
                <div onClick={() => setShowKpiTypeDropdown(!showKpiTypeDropdown)} className="w-full min-h-[42px] px-3 py-2 text-sm border border-border rounded-lg bg-background cursor-pointer flex flex-wrap gap-1 items-center">
                  {form.kpiTypes.length === 0 && <span className="text-muted-foreground">KPI tipi seçin (çoxlu seçim)</span>}
                  {form.kpiTypes.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-accent text-accent-foreground rounded-full">
                      {t}<X className="w-3 h-3 cursor-pointer" onClick={e => { e.stopPropagation(); toggleKpiType(t); }} />
                    </span>
                  ))}
                  <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
                </div>
                {showKpiTypeDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {kpiTypeOptions.length === 0 && <p className="p-3 text-xs text-muted-foreground">Məlumat kataloqunda KPI tipi yoxdur.</p>}
                    {kpiTypeOptions.map(t => (
                      <div key={t} onClick={e => { e.stopPropagation(); toggleKpiType(t); }} className={`px-3 py-2 text-sm cursor-pointer hover:bg-secondary flex items-center justify-between ${form.kpiTypes.includes(t) ? 'bg-primary/5' : ''}`}>
                        <span>{t}</span>
                        {form.kpiTypes.includes(t) && <Check className="w-4 h-4 text-primary" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">KPI kartı yaradılarkən seçilmiş tipə uyğun düstur avtomatik təklif olunacaq.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Dəyişənlər (kitabdan seçim)</label>
              <div className="relative mt-1">
                <div onClick={() => setShowVarDropdown(!showVarDropdown)} className="w-full min-h-[42px] px-3 py-2 text-sm border border-border rounded-lg bg-background cursor-pointer flex flex-wrap gap-1 items-center">
                  {form.variables.length === 0 && <span className="text-muted-foreground">Dəyişən seçin</span>}
                  {form.variables.map(s => <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">{s}<X className="w-3 h-3 cursor-pointer" onClick={e => { e.stopPropagation(); toggleVar(s); }} /></span>)}
                  <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground" />
                </div>
                {showVarDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {variables.length === 0 && <p className="p-3 text-xs text-muted-foreground">Kitabda dəyişən yoxdur.</p>}
                    {variables.map(v => (
                      <div key={v.id} onClick={e => { e.stopPropagation(); toggleVar(v.short); }} className={`px-3 py-2 text-sm cursor-pointer hover:bg-secondary flex items-center justify-between ${form.variables.includes(v.short) ? 'bg-primary/5' : ''}`}>
                        <div><span className="font-mono text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded mr-2">{v.short}</span><span>{v.name}</span><span className="ml-2 text-[10px] text-muted-foreground">({v.source})</span></div>
                        {form.variables.includes(v.short) && <Check className="w-4 h-4 text-primary" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Formula Builder</label>
              <div className="mt-1 border border-border rounded-lg overflow-hidden">
                <div className="flex flex-wrap gap-1 p-2 bg-secondary border-b border-border">
                  {form.variables.map(s => <button key={s} onClick={() => insertToken(s)} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded font-mono">{s}</button>)}
                  <button onClick={() => insertToken("(Nəticə)")} className="px-2 py-1 text-xs bg-accent text-accent-foreground rounded font-mono border border-accent-foreground/20">(Nəticə)</button>
                  <span className="text-xs text-muted-foreground px-1 py-1">|</span>
                  {["+", "-", "×", "÷", "(", ")", "100"].map(op => <button key={op} onClick={() => insertToken(` ${op} `)} className="px-2 py-1 text-xs bg-card border border-border rounded font-mono">{op}</button>)}
                </div>
                <input value={form.formula} onChange={e => setForm(p => ({ ...p, formula: e.target.value }))} placeholder="(CS / HS) × 100" className="w-full px-3 py-2.5 text-sm bg-background font-mono outline-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={save} className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium">💾 Yadda Saxla</button>
              <button onClick={() => { setShowDialog(false); setEditing(null); }} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card">Ləğv Et</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Silmək istədiyinizə əminsiniz?</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zone-red-bg">
              <AlertTriangle className="w-5 h-5 text-zone-red-text shrink-0" />
              <p className="text-sm text-zone-red-text"><strong>"{deleteConfirm?.name}"</strong> silinəcək.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={confirmDelete} className="flex-1 py-2.5 text-sm rounded-lg bg-destructive text-destructive-foreground font-medium">Sil</button>
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card">Ləğv Et</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormulasPage;

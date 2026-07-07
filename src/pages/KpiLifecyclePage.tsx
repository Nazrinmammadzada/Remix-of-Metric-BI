import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Workflow, Eye, Save, Upload, Trash2, FileText } from "lucide-react";
import { useKpiLifecycles, type CardLifecycle, setCardLifecycle } from "@/lib/kpiLifecycleStore";
import LifecycleDetailDialog from "@/components/kpi/LifecycleDetailDialog";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { withKartSuffix } from "@/lib/utils";
import {
  useLifecycleTemplates, addLifecycleTemplate, deleteLifecycleTemplate,
  type LifecycleTemplate,
} from "@/lib/lifecycleTemplatesStore";

const KpiLifecyclePage = () => {
  const lifecycles = useKpiLifecycles();
  const templates = useLifecycleTemplates();
  const [viewing, setViewing] = useState<CardLifecycle | null>(null);
  const [tab, setTab] = useState<"plans" | "templates">("plans");
  const [saveDialog, setSaveDialog] = useState<CardLifecycle | null>(null);
  const [loadDialog, setLoadDialog] = useState<CardLifecycle | null>(null);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");

  const rows = useMemo(
    () => lifecycles.slice().sort((a, b) => a.cardName.localeCompare(b.cardName)),
    [lifecycles],
  );

  const handleSaveTemplate = () => {
    if (!saveDialog || !tplName.trim()) {
      toast.error("Şablon adı tələb olunur");
      return;
    }
    addLifecycleTemplate({
      name: tplName.trim(),
      description: tplDesc.trim() || undefined,
      data: {
        assignment: saveDialog.assignment,
        evaluation: saveDialog.evaluation,
        bonus: saveDialog.bonus,
        reviews: saveDialog.reviews,
      },
    });
    toast.success("Şablon yadda saxlanıldı");
    setSaveDialog(null);
    setTplName("");
    setTplDesc("");
  };

  const handleApplyTemplate = (tpl: LifecycleTemplate) => {
    if (!loadDialog) return;
    setCardLifecycle(loadDialog.cardId, loadDialog.cardName, tpl.data);
    toast.success(`"${tpl.name}" şablonu "${loadDialog.cardName}" üçün tətbiq edildi`);
    setLoadDialog(null);
  };

  return (
    <div className="min-h-screen">
      <Header title="KPI lifecycle izlənilmələri" />
      <main className="p-6 pb-24">
        <PageHero
          badge="KPI lifecycle izlənilmələri"
          icon={Workflow}
          title="KPI lifecycle izlənilmələri"
          subtitle="Hər KPI kartı üçün təyin olunmuş planlama mərhələləri (təyinat, qiymətləndirmə, bonus, review)"
        />

        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="flex border-b border-border">
            <button
              onClick={() => setTab("plans")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "plans" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Lifecycle planları
            </button>
            <button
              onClick={() => setTab("templates")}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "templates" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Lifecycle şablonları
              {templates.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary">{templates.length}</span>
              )}
            </button>
          </div>

          {tab === "plans" ? (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Lifecycle Planları</h3>
                <span className="text-xs text-muted-foreground">{rows.length} kart</span>
              </div>
              <DataTable<CardLifecycle>
                rows={rows}
                rowKey={(l) => l.cardId}
                storageKey="kpi-lifecycle-table"
                emptyMessage="Hələ heç bir KPI üçün lifecycle təyin olunmayıb. KPI kartı yaradarkən 2-ci addımda lifecycle əlavə edin."
                columns={[
                  {
                    key: "name", label: "KPI Kartı", filterType: "text",
                    accessor: (l) => withKartSuffix(l.cardName),
                    render: (l) => <span className="font-medium text-foreground">{withKartSuffix(l.cardName)}</span>,
                  },
                  {
                    key: "reviews", label: "Review", filterType: "number",
                    accessor: (l) => l.reviews.length,
                    render: (l) => (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                        {l.reviews.length} ədəd
                      </span>
                    ),
                  },
                  {
                    key: "updated", label: "Son yenilənmə", filterType: "date",
                    accessor: (l) => l.updatedAt.slice(0, 10),
                    render: (l) => <span className="text-xs text-muted-foreground">{l.updatedAt.slice(0, 10)}</span>,
                  },
                  {
                    key: "op", label: "Əməliyyat", width: 220, align: "center", filterType: "none",
                    render: (l) => (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewing(l)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-primary/10 text-primary"
                          title="Detallara bax"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSaveDialog(l); setTplName(`${l.cardName} şablonu`); setTplDesc(""); }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-emerald-500/10 text-emerald-600"
                          title="Şablon kimi yadda saxla"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLoadDialog(l)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-sky-500/10 text-sky-600"
                          title="Şablondan yüklə"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          ) : (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Lifecycle Şablonları</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{templates.length} şablon</span>
                  <label className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-lg bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90">
                    <Upload className="w-4 h-4" />
                    Şablon yüklə
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const text = await file.text();
                          const parsed = JSON.parse(text);
                          const data = parsed.data || parsed;
                          if (!data || typeof data !== "object" || !Array.isArray(data.reviews)) {
                            toast.error("Yanlış şablon formatı");
                            return;
                          }
                          addLifecycleTemplate({
                            name: parsed.name || file.name.replace(/\.json$/i, ""),
                            description: parsed.description,
                            data,
                          });
                          toast.success("Şablon yükləndi");
                        } catch {
                          toast.error("Faylı oxumaq mümkün olmadı");
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              {templates.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  Hələ şablon yaradılmayıb. Lifecycle planları tabından "Şablon kimi yadda saxla" düyməsi ilə şablon əlavə edin.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map(t => (
                    <div key={t.id} className="border border-border rounded-xl p-4 bg-card hover:border-primary/40 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-medium text-sm text-foreground truncate">{t.name}</span>
                        </div>
                        <button
                          onClick={() => { deleteLifecycleTemplate(t.id); toast.success("Şablon silindi"); }}
                          className="text-muted-foreground hover:text-destructive"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{t.description}</p>}
                      <div className="mt-3 text-[11px] text-muted-foreground space-y-0.5">
                        <div>Təyinat: {t.data.assignment?.period ?? "—"}</div>
                        <div>Qiymətləndirmə: {t.data.evaluation?.period ?? "—"}</div>
                        <div>Bonus: {t.data.bonus?.period ?? "—"}</div>
                        <div>Review: {t.data.reviews.length} ədəd</div>
                      </div>
                      <div className="mt-3 text-[10px] text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <LifecycleDetailDialog
          open={!!viewing}
          onOpenChange={(o) => { if (!o) setViewing(null); }}
          lifecycle={viewing}
        />

        <Dialog open={!!saveDialog} onOpenChange={(o) => !o && setSaveDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Şablon kimi yadda saxla</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Şablon adı</label>
                <Input value={tplName} onChange={e => setTplName(e.target.value)} placeholder="Məs: Aylıq satış lifecycle" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Təsvir (məcburi deyil)</label>
                <Textarea value={tplDesc} onChange={e => setTplDesc(e.target.value)} rows={3} placeholder="Şablonun nə üçün istifadə olunacağı..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialog(null)}>Ləğv et</Button>
              <Button onClick={handleSaveTemplate} className="gap-2"><Save className="w-4 h-4" /> Yadda saxla</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!loadDialog} onOpenChange={(o) => !o && setLoadDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Şablondan yüklə — {loadDialog?.cardName}</DialogTitle>
            </DialogHeader>
            {templates.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Hələ heç bir şablon yoxdur.</div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleApplyTemplate(t)}
                    className="w-full text-left border border-border rounded-lg p-3 hover:border-primary/50 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm text-foreground">{t.name}</span>
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                    <div className="mt-2 text-[11px] text-muted-foreground">
                      Təyinat {t.data.assignment?.period ?? "—"} • Qiymətləndirmə {t.data.evaluation?.period ?? "—"} • Bonus {t.data.bonus?.period ?? "—"} • {t.data.reviews.length} review
                    </div>
                  </button>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setLoadDialog(null)}>Bağla</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default KpiLifecyclePage;

import { Fragment, useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Plus, ChevronDown, ChevronRight, ChevronLeft, Sparkles, Info, FileText } from "lucide-react";
import { getAssignments, type FormulaAssignment } from "@/lib/formulaAssignmentsStore";
import { getEmployees } from "@/lib/orgStore";
import BulkAssignWizard from "@/components/formulas/BulkAssignWizard";

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "—"; }
};

const FormulaAssignmentsPage = ({ onBack }: { onBack?: () => void }) => {
  const [rows, setRows] = useState<FormulaAssignment[]>(() => getAssignments());
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const employees = useMemo(() => getEmployees(), [rows]);

  useEffect(() => {
    const refresh = () => setRows(getAssignments());
    window.addEventListener("formula-assignments-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("formula-assignments-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (wizardOpen) return <BulkAssignWizard onBack={() => setWizardOpen(false)} onDone={() => setRows(getAssignments())} />;

  const toggleExpand = (id: number) => setExpandedId(prev => prev === id ? null : id);

  return (
    <div className="min-h-screen">
      <Header title="Hesablama Düsturları" />
      <main className="p-6 pb-24 space-y-4">
        {onBack && (
          <button onClick={onBack} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary/40">
            <ChevronLeft className="w-4 h-4" /> Geri
          </button>
        )}
        <PageHero
          badge="Hesablama"
          icon={Sparkles}
          title="Hesablama Düsturları"
          subtitle="Düsturların əməkdaşlara təyinatı və izlənməsi"
          right={
            <button
              onClick={() => setWizardOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Düstur təyin et
            </button>
          }
        />

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/50 text-left text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="w-10 px-3 py-3"></th>
                  <th className="px-3 py-3">Düsturun adı</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Təyin tarixi</th>
                  <th className="px-3 py-3">Dəyişənlər</th>
                  <th className="px-3 py-3">Əməkdaş sayı</th>
                  <th className="px-3 py-3">Son yenilənmə</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Heç bir düstur təyinatı yoxdur</td></tr>
                )}
                {rows.map(r => {
                  const isOpen = expandedId === r.id;
                  const empList = r.employeeIds.map(id => employees.find(e => e.id === id)).filter(Boolean);
                  return (
                    <Fragment key={r.id}>
                      <tr key={r.id} className={`border-t border-border transition-colors ${isOpen ? "bg-blue-50/40 dark:bg-blue-500/5" : "hover:bg-secondary/30"}`}>
                        <td className="px-3 py-3">
                          <button onClick={() => toggleExpand(r.id)} className="p-1 rounded hover:bg-secondary">
                            {isOpen ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        </td>
                        <td className="px-3 py-3 font-medium">{r.formulaName}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full border ${r.status === "active"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                            : "bg-secondary text-muted-foreground border-border"}`}>
                            {r.status === "active" ? "Aktiv" : "Passiv"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{fmtDate(r.assignedAt)}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[280px]">
                            {r.variables.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                            {r.variables.map(v => (
                              <span key={v} className="px-2 py-0.5 text-[11px] rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{v}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${r.employeeIds.length > 0
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                            : "bg-secondary text-muted-foreground"}`}>
                            {r.employeeIds.length}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{fmtDate(r.updatedAt)}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-blue-50/20 dark:bg-blue-500/5 border-t border-border">
                          <td></td>
                          <td colSpan={6} className="px-4 py-4">
                            {empList.length === 0 ? (
                              <div className="flex items-start gap-3 rounded-lg bg-secondary/60 border border-border p-4">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 font-medium">
                                    <FileText className="w-4 h-4" /> Bu düstur üzrə hələ heç bir əməkdaş təyin edilməyib.
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    İlk təyinatı etmək üçün yuxarı sağ hissədə yerləşən <b>"Düstur təyin et"</b> düyməsindən istifadə edin.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg border border-border overflow-hidden bg-background">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-secondary/60 text-left text-xs text-muted-foreground">
                                      <th className="px-3 py-2">Əməkdaşın A.S.A.</th>
                                      <th className="px-3 py-2">Ata adı</th>
                                      <th className="px-3 py-2">Struktur</th>
                                      <th className="px-3 py-2">Vəzifə</th>
                                      <th className="px-3 py-2">Təyin tarixi</th>
                                      <th className="px-3 py-2">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {empList.map((e) => e && (
                                      <tr key={e.id} className="border-t border-border">
                                        <td className="px-3 py-2 font-medium">{e.lastName} {e.firstName}</td>
                                        <td className="px-3 py-2 text-muted-foreground">{e.fatherName ?? "—"}</td>
                                        <td className="px-3 py-2 text-muted-foreground">{e.structurePath ?? "—"}</td>
                                        <td className="px-3 py-2">{e.positionName ?? "—"}</td>
                                        <td className="px-3 py-2 text-muted-foreground">{fmtDate(r.assignedAt)}</td>
                                        <td className="px-3 py-2">
                                          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">Aktiv</span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FormulaAssignmentsPage;

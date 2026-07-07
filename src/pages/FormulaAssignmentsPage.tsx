import { useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Plus, ChevronLeft, Sparkles, Info, FileText } from "lucide-react";
import { getAssignments, type FormulaAssignment } from "@/lib/formulaAssignmentsStore";
import { getEmployees } from "@/lib/orgStore";
import BulkAssignWizard from "@/components/formulas/BulkAssignWizard";
import { DataTable } from "@/components/common/DataTable";

const fmtDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("az-AZ", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "—"; }
};

const FormulaAssignmentsPage = ({ onBack }: { onBack?: () => void }) => {
  const [rows, setRows] = useState<FormulaAssignment[]>(() => getAssignments());
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

        <DataTable<FormulaAssignment>
          rows={rows}
          rowKey={(r) => r.id}
          storageKey="formula-assignments-table"
          emptyMessage="Heç bir düstur təyinatı yoxdur"
          columns={[
            {
              key: "formulaName", label: "Düsturun adı", filterType: "text",
              accessor: (r) => r.formulaName,
              render: (r) => <span className="font-medium">{r.formulaName}</span>,
            },
            {
              key: "status", label: "Status", filterType: "select", selectOptions: ["active", "passive"],
              accessor: (r) => r.status,
              render: (r) => (
                <span className={`px-2 py-0.5 text-xs rounded-full border ${r.status === "active"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                  : "bg-secondary text-muted-foreground border-border"}`}>
                  {r.status === "active" ? "Aktiv" : "Passiv"}
                </span>
              ),
            },
            {
              key: "assignedAt", label: "Təyin tarixi", filterType: "date",
              accessor: (r) => r.assignedAt,
              render: (r) => <span className="text-muted-foreground">{fmtDate(r.assignedAt)}</span>,
            },
            {
              key: "variables", label: "Dəyişənlər", filterType: "text",
              accessor: (r) => r.variables.join(", "),
              render: (r) => (
                <div className="flex flex-wrap gap-1">
                  {r.variables.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                  {r.variables.map(v => (
                    <span key={v} className="px-2 py-0.5 text-[11px] rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{v}</span>
                  ))}
                </div>
              ),
            },
            {
              key: "count", label: "Əməkdaş sayı", filterType: "number", align: "center",
              accessor: (r) => r.employeeIds.length,
              render: (r) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${r.employeeIds.length > 0
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                  : "bg-secondary text-muted-foreground"}`}>
                  {r.employeeIds.length}
                </span>
              ),
            },
            {
              key: "updatedAt", label: "Son yenilənmə", filterType: "date",
              accessor: (r) => r.updatedAt,
              render: (r) => <span className="text-muted-foreground">{fmtDate(r.updatedAt)}</span>,
            },
          ]}
          renderExpandedRow={(r) => {
            const empList = r.employeeIds.map(id => employees.find(e => e.id === id)).filter(Boolean);
            if (empList.length === 0) {
              return (
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
              );
            }
            return (
              <DataTable
                rows={empList as NonNullable<typeof empList[number]>[]}
                rowKey={(e) => e!.id}
                storageKey={`formula-assignments-table:emp:${r.id}`}
                initialFontSize={12}
                initialRowsPerPage={10}
                emptyMessage="Əməkdaş yoxdur"
                columns={[
                  {
                    key: "name", label: "Əməkdaşın A.S.A.", filterType: "text",
                    accessor: (e: any) => [e.firstName, e.lastName, e.fatherName].filter(Boolean).join(" "),
                    render: (e: any) => <span className="font-medium">{[e.firstName, e.lastName, e.fatherName].filter(Boolean).join(" ")}</span>,
                  },
                  { key: "structure", label: "Struktur", filterType: "text", accessor: (e: any) => e.structurePath ?? "—" },
                  { key: "position", label: "Vəzifə", filterType: "text", accessor: (e: any) => e.positionName ?? "—" },
                  {
                    key: "assignedAt", label: "Təyin tarixi", filterType: "date",
                    accessor: () => r.assignedAt,
                    render: () => <span className="text-muted-foreground">{fmtDate(r.assignedAt)}</span>,
                  },
                  {
                    key: "status", label: "Status", filterType: "select", selectOptions: ["Aktiv"],
                    accessor: () => "Aktiv",
                    render: () => (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">Aktiv</span>
                    ),
                  },
                ]}
              />
            );
          }}
        />
      </main>
    </div>
  );
};

export default FormulaAssignmentsPage;

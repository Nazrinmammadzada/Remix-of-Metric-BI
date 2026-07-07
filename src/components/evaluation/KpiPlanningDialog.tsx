import { useMemo, useState } from "react";
import { CalendarDays, Plus, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { mockEmployees } from "@/data/mockData";
import { getApprovalMatrices, formatAssignee, type ApprovalMatrix } from "@/lib/matrixStore";

type EvalKind = "halfYear" | "annual";

interface PeriodRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  evalStart: string;
  evalEnd: string;
  status: "Planlaşdırılır" | "Aktiv" | "Tamamlandı";
}

const uid = () => Math.random().toString(36).slice(2, 9);

const buildHalfYearRows = (year: number): PeriodRow[] => [
  {
    id: uid(),
    name: "1-ci yarımil (Yanvar – İyun)",
    startDate: `${year}-01-01`,
    endDate: `${year}-06-30`,
    evalStart: `${year}-07-01`,
    evalEnd: `${year}-07-15`,
    status: "Planlaşdırılır",
  },
  {
    id: uid(),
    name: "2-ci yarımil (İyul – Dekabr)",
    startDate: `${year}-07-01`,
    endDate: `${year}-12-31`,
    evalStart: `${year + 1}-01-01`,
    evalEnd: `${year + 1}-01-15`,
    status: "Planlaşdırılır",
  },
];

const buildAnnualRow = (year: number): PeriodRow => ({
  id: uid(),
  name: `${year} illik dövr`,
  startDate: `${year}-01-01`,
  endDate: `${year}-12-31`,
  evalStart: `${year + 1}-01-01`,
  evalEnd: `${year + 1}-01-31`,
  status: "Planlaşdırılır",
});

interface KpiPlanningDialogProps { trigger?: React.ReactNode; }

const KpiPlanningDialog = ({ trigger }: KpiPlanningDialogProps = {}) => {
  const [open, setOpen] = useState(false);
  const year = new Date().getFullYear() + 1;

  const [name, setName] = useState(`${year} KPI Qiymətləndirmə Planı`);
  const [planStart, setPlanStart] = useState(`${year}-01-01`);
  const [planEnd, setPlanEnd] = useState(`${year}-12-31`);
  const [department, setDepartment] = useState("all");

  const [halfYear, setHalfYear] = useState(true);
  const [annual, setAnnual] = useState(false);

  const [rows, setRows] = useState<PeriodRow[]>(buildHalfYearRows(year));

  const [remindEnabled, setRemindEnabled] = useState(true);
  const [remindDays, setRemindDays] = useState("7");
  const approvalMatrices = useMemo<ApprovalMatrix[]>(() => getApprovalMatrices(), [open]);
  const [approval, setApproval] = useState<string>(() => approvalMatrices[0]?.id || "none");
  const selectedMatrix = useMemo(() => approvalMatrices.find(m => m.id === approval) || null, [approvalMatrices, approval]);

  const departments = useMemo(
    () => Array.from(new Set(mockEmployees.map((e) => e.department))),
    [],
  );

  const toggleKind = (kind: EvalKind, checked: boolean) => {
    if (kind === "halfYear") {
      setHalfYear(checked);
      setRows((prev) => {
        const others = prev.filter((r) => !r.name.includes("yarımil"));
        return checked ? [...buildHalfYearRows(year), ...others] : others;
      });
    } else {
      setAnnual(checked);
      setRows((prev) => {
        const others = prev.filter((r) => !r.name.includes("illik"));
        return checked ? [...others, buildAnnualRow(year)] : others;
      });
    }
  };

  const updateRow = (id: string, patch: Partial<PeriodRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        id: uid(),
        name: `Yeni dövr ${prev.length + 1}`,
        startDate: "",
        endDate: "",
        evalStart: "",
        evalEnd: "",
        status: "Planlaşdırılır",
      },
    ]);

  const reset = () => {
    setName(`${year} KPI Qiymətləndirmə Planı`);
    setPlanStart(`${year}-01-01`);
    setPlanEnd(`${year}-12-31`);
    setDepartment("all");
    setHalfYear(true);
    setAnnual(false);
    setRows(buildHalfYearRows(year));
    setRemindEnabled(true);
    setRemindDays("7");
    setApproval(approvalMatrices[0]?.id || "none");
  };

  const validate = (): string | null => {
    if (!name.trim()) return "Planın adı tələb olunur";
    if (!planStart || !planEnd) return "Plan dövrü tələb olunur";
    if (!halfYear && !annual) return "Ən azı 1 qiymətləndirmə tipi seçilməlidir";
    if (rows.length === 0) return "Ən azı 1 dövr əlavə edin";
    for (const r of rows) {
      if (!r.startDate || !r.endDate || !r.evalStart || !r.evalEnd)
        return `"${r.name}" üçün bütün tarixlər doldurulmalıdır`;
      if (r.endDate < r.startDate)
        return `"${r.name}" bitmə tarixi başlama tarixindən kiçik ola bilməz`;
      if (r.evalStart < r.endDate)
        return `"${r.name}" qiymətləndirmə tarixi bitmə tarixindən əvvəl ola bilməz`;
      if (r.evalEnd < r.evalStart)
        return `"${r.name}" qiymətləndirmə bitmə tarixi yanlışdır`;
    }
    // overlap check
    const sorted = [...rows].sort((a, b) => a.startDate.localeCompare(b.startDate));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startDate <= sorted[i - 1].endDate)
        return `Dövrlər üst-üstə düşür: "${sorted[i - 1].name}" və "${sorted[i].name}"`;
    }
    return null;
  };

  const submit = () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    toast.success("KPI planı yadda saxlandı", {
      description: `${name} · ${rows.length} dövr`,
    });
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5 h-9">
            <Plus className="w-3.5 h-3.5" /> Yeni plan yarat
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="max-w-[1000px] w-[95vw] max-h-[92vh] overflow-y-auto rounded-xl p-0 gap-0"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-foreground">KPI Planlama</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Ümumi KPI qiymətləndirmə planı yaradın. Bu plan bütün KPI-lər üçün
                qiymətləndirmə dövrlərini müəyyən edir.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Section 1 — Plan info */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Planın adı <span className="text-destructive">*</span>
              </Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Plan dövrü <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Input type="date" value={planStart} onChange={(e) => setPlanStart(e.target.value)} />
                <Input type="date" value={planEnd} onChange={(e) => setPlanEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Departament</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Bütün departamentlər</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Section 2 — Evaluation type */}
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Qiymətləndirmə tipi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { kind: "halfYear" as const, title: "Yarımillik qiymətləndirmə", desc: "İldə 2 dəfə qiymətləndirmə aparılır.", badge: "6M", checked: halfYear, recommended: true },
                { kind: "annual" as const, title: "İllik qiymətləndirmə", desc: "İldə 1 dəfə qiymətləndirmə aparılır.", badge: "12M", checked: annual },
              ].map((c) => (
                <button
                  type="button"
                  key={c.kind}
                  onClick={() => toggleKind(c.kind, !c.checked)}
                  className={`text-left rounded-xl border p-4 transition-all flex items-start gap-3 ${
                    c.checked
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${c.checked ? "border-primary" : "border-muted-foreground/40"}`}>
                    {c.checked && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                    {c.recommended && (
                      <Badge className="mt-2 bg-primary/15 text-primary hover:bg-primary/20 text-[10px]">
                        Tövsiyə olunur
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                    <CalendarDays className="w-3.5 h-3.5" /> {c.badge}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Section 3 — Periods */}
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Qiymətləndirmə dövrləri
            </h3>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">#</th>
                    <th className="px-3 py-2 text-left">Dövr</th>
                    <th className="px-3 py-2 text-left">Başlama tarixi</th>
                    <th className="px-3 py-2 text-left">Bitmə tarixi</th>
                    <th className="px-3 py-2 text-left">Qiymətləndirmə tarixi</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2">
                        <Input
                          value={r.name}
                          onChange={(e) => updateRow(r.id, { name: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="date" value={r.startDate} onChange={(e) => updateRow(r.id, { startDate: e.target.value })} className="h-8 text-xs" />
                      </td>
                      <td className="px-3 py-2">
                        <Input type="date" value={r.endDate} onChange={(e) => updateRow(r.id, { endDate: e.target.value })} className="h-8 text-xs" />
                      </td>
                      <td className="px-3 py-2">
                        <div className="grid grid-cols-2 gap-1">
                          <Input type="date" value={r.evalStart} onChange={(e) => updateRow(r.id, { evalStart: e.target.value })} className="h-8 text-xs" />
                          <Input type="date" value={r.evalEnd} onChange={(e) => updateRow(r.id, { evalEnd: e.target.value })} className="h-8 text-xs" />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeRow(r.id)}
                          className="p-1.5 rounded hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-xs text-muted-foreground">
                        Dövr yoxdur
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            <Button variant="outline" size="sm" onClick={addRow} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Dövr əlavə et
            </Button>
          </section>

          {/* Section 4 — Reminders */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Əlavə parametrlər
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <Checkbox checked={remindEnabled} onCheckedChange={(v) => setRemindEnabled(Boolean(v))} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Xatırlatma göndər</p>
                  <p className="text-xs text-muted-foreground">
                    Qiymətləndirmə başlamazdan əvvəl istifadəçilərə xatırlatma göndərilsin.
                  </p>
                </div>
              </label>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Xatırlatma müddəti</Label>
                <Select value={remindDays} onValueChange={setRemindDays} disabled={!remindEnabled}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Qiymətləndirmədən 3 gün əvvəl</SelectItem>
                    <SelectItem value="7">Qiymətləndirmədən 7 gün əvvəl</SelectItem>
                    <SelectItem value="14">Qiymətləndirmədən 14 gün əvvəl</SelectItem>
                    <SelectItem value="30">Qiymətləndirmədən 30 gün əvvəl</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Section 5 — Approval matrix */}
          <section className="space-y-1.5">
            <Label className="text-xs font-medium">
              Təsdiqləmə matrisi <span className="text-muted-foreground font-normal">(Təsdiqləmə Matrisi modulundan)</span>
            </Label>
            <Select value={approval} onValueChange={setApproval}>
              <SelectTrigger><SelectValue placeholder="Matris seçin" /></SelectTrigger>
              <SelectContent className="max-w-[640px]">
                <SelectItem value="none">Təsdiq tələb olunmur</SelectItem>
                {approvalMatrices.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                    <span className="text-muted-foreground ml-2 text-xs">
                      ({m.mode === "position" ? "vəzifəyə görə" : "istifadəçiyə görə"} · {m.steps.length} mərhələ)
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMatrix && (
              <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Mərhələlər</p>
                {selectedMatrix.steps.map((s, i) => (
                  <div key={s.id} className="flex items-start gap-2 text-xs">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 text-[10px]">{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{s.label}</p>
                      <p className="text-muted-foreground">
                        {s.assignees.map(a => formatAssignee(a)).join(", ") || "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2 rounded-b-xl">
          <Button variant="outline" onClick={() => setOpen(false)}>Ləğv et</Button>
          <Button onClick={submit}>Yadda saxla</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KpiPlanningDialog;

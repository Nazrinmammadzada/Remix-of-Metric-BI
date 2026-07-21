// Yalnız seçilmiş hədəfə aid detal — heç bir digər hədəf, KPI və ya
// başqa məlumat qarışdırılmır.
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { AccordionTarget } from "./KpiAccordionList";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kpiName: string;
  target: AccordionTarget | null;
  deadline?: string;
  status?: string;
}

const toNumber = (v: number | string | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};

const fmt = (v: number | string | undefined): string => {
  const n = toNumber(v);
  if (!n && v !== 0 && v !== "0") return String(v ?? "—");
  return new Intl.NumberFormat("az-AZ").format(n);
};

const TargetDetailDialog = ({ open, onOpenChange, kpiName, target, deadline, status }: Props) => {
  if (!target) return null;
  const plan = toNumber(target.plan);
  const fakt = toNumber(target.fakt);
  const pct = plan ? Math.round((fakt / plan) * 100) : 0;
  const unit = target.unit ? (target.unit === "AZN" ? " ₼" : ` ${target.unit}`) : "";

  // Demo review/tarixçə/şərh yalnız bu hədəfə aiddir
  const reviews = [
    { id: "r1", date: "15.03.2026", author: "Rəşad Quliyev", note: "İcra dinamikası müsbətdir." },
    { id: "r2", date: "01.04.2026", author: "Rəşad Quliyev", note: "Kampaniya nəticəsi gözləniləndən yüksəkdir." },
  ];
  const history = [
    { id: "h1", date: "10.02.2026", from: `${fmt(fakt / 2)}${unit}`, to: `${fmt(fakt)}${unit}` },
    { id: "h2", date: "05.01.2026", from: `0${unit}`, to: `${fmt(fakt / 2)}${unit}` },
  ];
  const comments = [
    { id: "c1", author: "Aysel Məmmədova", date: "12.03.2026", text: "Hədəfin icrası planla uyğundur." },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate">Hədəf: {target.name}</DialogTitle>
          <p className="text-xs text-muted-foreground truncate">KPI: {kpiName}</p>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Plan" value={`${fmt(target.plan)}${unit}`} />
            <Stat label="Fakt" value={`${fmt(target.fakt)}${unit}`} />
            <Stat label="İcra %" value={`${pct}%`} />
            <Stat label="Deadline" value={deadline || "—"} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">İcra faizi</span>
              {status && <Badge variant="outline">{status}</Badge>}
            </div>
            <Progress value={Math.min(pct, 100)} />
          </div>

          <Section title="Review-lər">
            {reviews.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Review qeydi yoxdur.</p>
            ) : reviews.map(r => (
              <div key={r.id} className="p-2.5 rounded-md border border-border bg-card text-xs">
                <div className="flex justify-between text-muted-foreground mb-0.5"><span>{r.author}</span><span>{r.date}</span></div>
                <p className="text-foreground">{r.note}</p>
              </div>
            ))}
          </Section>

          <Section title="Tarixçə">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between text-xs p-2 rounded-md bg-secondary/40">
                <span className="text-muted-foreground">{h.date}</span>
                <span className="text-foreground"><span className="text-muted-foreground">{h.from}</span> → <strong>{h.to}</strong></span>
              </div>
            ))}
          </Section>

          <Section title="Şərhlər">
            {comments.map(c => (
              <div key={c.id} className="p-2.5 rounded-md border border-border bg-card text-xs">
                <div className="flex justify-between text-muted-foreground mb-0.5"><span>{c.author}</span><span>{c.date}</span></div>
                <p className="text-foreground">{c.text}</p>
              </div>
            ))}
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="p-2.5 rounded-lg border border-border bg-card">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold text-foreground tabular-nums">{value}</p>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h4 className="text-sm font-semibold text-foreground mb-2">{title}</h4>
    <div className="space-y-1.5">{children}</div>
  </div>
);

export default TargetDetailDialog;

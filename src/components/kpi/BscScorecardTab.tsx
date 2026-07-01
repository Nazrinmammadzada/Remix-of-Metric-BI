import { useMemo, useState } from "react";
import { Target, Scale, Info, ChevronDown, ChevronRight, User as UserIcon, Sliders } from "lucide-react";
import { getEntriesForCard, type LimitSet, TIER_LABELS, suggestLimitsFromTarget } from "@/lib/kpiSetStore";

interface SubKpiLike {
  id: number;
  name: string;
  target?: string;
  unit?: string;
  weight?: number;
  evaluator?: { type?: string | null; persons?: { name: string; weight: number }[]; integrationName?: string };
  assigner?: string;
}

interface KpiLike {
  id?: number;
  name: string;
  target: string;
  current: string;
  unit: string;
  type: string;
  department: string;
  weight: number;
  formula?: string;
  subKpis?: SubKpiLike[];
}

const perspectiveByDept: Record<string, string> = {
  "Satış Departamenti": "Maliyyə",
  "Marketinq": "Müştəri",
  "Müştəri Xidmətləri": "Müştəri",
  "Əməliyyatlar": "Daxili Proseslər",
  "R&D": "Öyrənmə və İnkişaf",
  "Audit Departamenti": "Daxili Proseslər",
};

const parseNum = (v: string): number => {
  if (!v) return 0;
  const s = String(v).replace(/\s+/g, "").replace(",", ".");
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return 0;
  let n = parseFloat(m[0]);
  if (/m/i.test(s)) n *= 1_000_000;
  else if (/k/i.test(s)) n *= 1_000;
  return n;
};

const fmt = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const gsrToScore = (gsr: number) => {
  if (gsr >= 90) return 5;
  if (gsr >= 80) return 4;
  if (gsr >= 60) return 3;
  if (gsr >= 40) return 2;
  return 1;
};

const gsrTone = (gsr: number) => {
  if (gsr >= 95) return { bg: "bg-zone-green-bg", text: "text-zone-green-text", label: "Əla Performans", barColor: "bg-zone-green-text" };
  if (gsr >= 80) return { bg: "bg-zone-yellow-bg", text: "text-zone-yellow-text", label: "Yaxşı Performans", barColor: "bg-zone-yellow-text" };
  return { bg: "bg-zone-red-bg", text: "text-zone-red-text", label: "Aşağı Performans", barColor: "bg-zone-red-text" };
};

const scoreLabels = ["", "Aşağı", "Orta-Aşağı", "Orta", "Yaxşı", "Çox Yaxşı"];

const isInverse = (type: string, name: string) => {
  const k = `${type} ${name}`.toLowerCase();
  return /(xərc|müddət|şikayət|cost|time|defect|qüsur)/i.test(k);
};

// Vahidə görə dəyər formatla (faiz isə % əlavə et)
const fmtUnit = (n: number, unit: string) => {
  const isPct = unit === "%" || /faiz/i.test(unit);
  if (isPct) return `${Math.round(n)}%`;
  return `${fmt(n)} ${unit}`.trim();
};

// % aralıqlarını hədəfə görə vahid aralığına çevir
const unitRangesFromTarget = (target: number, unit: string) => {
  const pcts = [
    { from: 0, to: 39, score: 1, label: "Aşağı", tone: "bg-zone-red-bg text-zone-red-text" },
    { from: 40, to: 59, score: 2, label: "Orta-Aşağı", tone: "bg-zone-red-bg/60 text-zone-red-text" },
    { from: 60, to: 79, score: 3, label: "Orta", tone: "bg-zone-yellow-bg text-zone-yellow-text" },
    { from: 80, to: 89, score: 4, label: "Yaxşı", tone: "bg-zone-green-bg/70 text-zone-green-text" },
    { from: 90, to: 100, score: 5, label: "Çox Yaxşı", tone: "bg-zone-green-bg text-zone-green-text" },
  ];
  const isPct = unit === "%" || /faiz/i.test(unit) || !target;
  return pcts.map(p => ({
    ...p,
    rangeText: isPct
      ? `${p.from}% - ${p.to}${p.score === 5 ? "%+" : "%"}`
      : `${fmtUnit((target * p.from) / 100, unit)} – ${fmtUnit((target * p.to) / 100, unit)}`,
  }));
};

export default function BscScorecardTab({ kpi }: { kpi: KpiLike }) {
  const target = parseNum(kpi.target);
  const actual = parseNum(kpi.current);
  const inverse = isInverse(kpi.type, kpi.name);
  const gsr = inverse
    ? (actual === 0 ? 0 : (target / actual) * 100)
    : (target === 0 ? 0 : (actual / target) * 100);
  const gsrClamped = Math.max(0, Math.min(150, gsr));
  const score = gsrToScore(gsr);
  const tone = gsrTone(gsr);
  const perspective = perspectiveByDept[kpi.department] || "Daxili Proseslər";
  const unit = kpi.unit || "";

  const formulaText = inverse
    ? "GSR = ( Hədəf Dəyər / Faktiki Dəyər ) × 100"
    : "GSR = ( Faktiki Dəyər / Hədəf Dəyər ) × 100";
  const sampleText = inverse
    ? `GSR = ( ${fmt(target)} / ${fmt(actual)} ) × 100`
    : `GSR = ( ${fmt(actual)} / ${fmt(target)} ) × 100`;

  const ranges = useMemo(() => unitRangesFromTarget(target, unit), [target, unit]);

  // KPI Set entry-lərini sub-KPI kimi birləşdir
  const mergedSubKpis = useMemo(() => {
    const own = kpi.subKpis || [];
    if (!kpi.id) return own.map(s => ({ ...s, _entryId: null as string | null, limits: undefined as LimitSet | undefined }));
    const entries = getEntriesForCard(kpi.id);
    const ownById = new Map(own.map(s => [s.id, s]));
    const list: any[] = own.map(s => {
      const e = entries.find(en => en.subKpiId === s.id);
      return { ...s, _entryId: e?.id ?? null, limits: e?.limits, assignerFromSet: e?.assigneeName, unit: s.unit || e?.unit };
    });
    // KPI Set-də olan, kartda olmayan sub-KPI-lar
    entries.forEach(e => {
      if (!ownById.has(e.subKpiId) && e.subKpiName) {
        list.push({
          id: e.subKpiId,
          name: e.subKpiName,
          target: e.target,
          unit: e.unit,
          weight: 0,
          assignerFromSet: e.assigneeName,
          limits: e.limits,
          _entryId: e.id,
        });
      }
    });
    return list;
  }, [kpi.id, kpi.subKpis]);

  const [openSubId, setOpenSubId] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {/* Hədəflər (əvvəllər Sub-KPI-lar) — kart daxilində ümumi hədəf yoxdur */}
      {mergedSubKpis.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-3 py-2 border-b border-border flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">Sub-KPI-lar ({mergedSubKpis.length})</p>
            <span className="text-[10px] text-muted-foreground">Açmaq üçün klikləyin — qiymət limitləri görünəcək</span>
          </div>
          <div className="divide-y divide-border">
            {mergedSubKpis.map(sk => {
              const isOpen = openSubId === sk.id;
              const assigner =
                sk.assigner ||
                sk.assignerFromSet ||
                (sk.evaluator?.persons?.length ? sk.evaluator.persons.map((p: any) => p.name).join(", ") : null);
              const limits: LimitSet | undefined = sk.limits || (sk.target ? suggestLimitsFromTarget(sk.target) : undefined);
              return (
                <div key={sk.id}>
                  <button
                    onClick={() => setOpenSubId(isOpen ? null : sk.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="text-sm font-medium text-foreground truncate">{sk.name}</span>
                      {sk.target && (
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">• Hədəf: {sk.target} {sk.unit || ""}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {assigner && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          <UserIcon className="w-3 h-3" /> {assigner}
                        </span>
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 bg-secondary/20">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2 mt-1">
                        <Sliders className="w-3 h-3 text-primary" />
                        Qiymət Limitləri {sk.limits ? "(KPI Set-dən)" : "(avtomatik təklif)"}
                      </div>
                      {limits ? (
                        <div className="grid grid-cols-5 gap-1.5">
                          {TIER_LABELS.map(({ tier, score: sc, label }) => {
                            const r = limits[tier];
                            return (
                              <div key={tier} className="rounded-md border border-border bg-background px-2 py-1.5 text-center">
                                <p className="text-[10px] text-muted-foreground">{label}</p>
                                <p className="text-[11px] font-semibold text-foreground tabular-nums mt-0.5">
                                  {fmtUnit(r.min, sk.unit || "")} – {fmtUnit(r.max, sk.unit || "")}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">Hələ limit təyin olunmayıb.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Hesablama Düsturu</p>
          <div className="mt-1 text-xs font-mono text-foreground">{formulaText}</div>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <p className="text-[11px] text-muted-foreground">Nümunə</p>
          <div className="mt-1 text-xs font-mono text-foreground flex flex-wrap items-center gap-1">
            <span>{sampleText}</span>
            <span className={`${tone.text} font-semibold`}>= {gsr.toFixed(0)}%</span>
            <span className="text-muted-foreground">→ Bal {score}</span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground">Bal avtomatik olaraq hədəfin vahidi üzrə aralıqdan asılı təyin edilir.</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card px-3 py-2 flex items-center gap-3">
        <Scale className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">Ümumi BSC Balı</p>
        <p className="text-base font-semibold text-foreground tabular-nums">{score.toFixed(2)}<span className="text-xs font-normal text-muted-foreground"> / 5</span></p>
        <div className="flex-1 min-w-[80px]">
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div className={`h-1.5 ${tone.barColor}`} style={{ width: `${Math.min(100, gsrClamped)}%` }} />
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${tone.bg} ${tone.text} whitespace-nowrap`}>{tone.label} · {gsr.toFixed(0)}%</span>
      </div>
    </div>
  );
}

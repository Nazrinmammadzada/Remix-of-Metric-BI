import { useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { BarChart3, Search, Eye, Check, X as XIcon, ChevronDown, User as UserIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import ExportMenu from "@/components/common/ExportMenu";
import { getEmployees } from "@/lib/orgStore";
import { MONTHS, type Month } from "@/lib/salaryStore";

const YEARS = [2024, 2025, 2026];

const KPI_CARDS = [
  "Satış Həcmi",
  "Müştəri Məmnuniyyəti",
  "Komanda İşi",
  "Vaxtında Tapşırıq Yerinə Yetirmə",
  "Peşəkar İnkişaf",
  "Yeni Müştəri Cəlbi",
];

const EVALUATORS = [
  { name: "Rəşad Quliyev", role: "Satış Direktoru" },
  { name: "Aysel İbrahimova", role: "Keyfiyyət Meneceri" },
  { name: "Rauf Məmmədov", role: "HR Meneceri" },
  { name: "Günel Əlizadə", role: "HR Direktoru" },
  { name: "Nigar Hüseynova", role: "CFO" },
];

const monthIdx = (m: string) => MONTHS.indexOf(m as Month);
const pad = (n: number) => String(n).padStart(2, "0");
const lastDayOfMonth = (year: number, mIdx: number) => new Date(year, mIdx + 1, 0).getDate();

// Deterministic pseudo-score so the page is stable across renders
const scoreFor = (empId: number, cardIdx: number, year: number, mIdx: number) => {
  const seed = (empId * 31 + cardIdx * 7 + year + mIdx * 3) % 100;
  const base = 3.4 + (seed / 100) * 1.6; // 3.4..5.0
  return Math.round(base * 10) / 10;
};

// Hər hədəf üçün 1–3 qiymətləndirici (çəki + bal) — bəzilərində 2+ qiymətləndirici olur.
const evaluatorsFor = (empId: number, cardIdx: number): { name: string; role: string; weight: number; score: number }[] => {
  const count = ((empId + cardIdx) % 3) + 1; // 1, 2 və ya 3
  const picks: { name: string; role: string; weight: number; score: number }[] = [];
  for (let i = 0; i < count; i++) {
    const ev = EVALUATORS[(empId + cardIdx + i * 2) % EVALUATORS.length];
    const seed = (empId * 17 + cardIdx * 5 + i * 11) % 100;
    const s = Math.round((2 + (seed / 100) * 3) * 10) / 10; // 2..5
    picks.push({ name: ev.name, role: ev.role, weight: 0, score: s });
  }
  // Çəkiləri 100%-ə normallaşdır (ilk fərqli paylar: 80/20, 60/30/10 və s.)
  const weights = count === 1 ? [100] : count === 2 ? [70, 30] : [50, 30, 20];
  picks.forEach((p, i) => (p.weight = weights[i]));
  return picks;
};

const evaluatorFor = (empId: number, cardIdx: number) =>
  EVALUATORS[(empId + cardIdx) % EVALUATORS.length];

const scoreColor = (s: number) =>
  s >= 4.5
    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
    : s >= 4.0
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    : s >= 3.5
    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
    : "bg-destructive/15 text-destructive border-destructive/30";

interface ScoreRow {
  empId: number;
  fullName: string;
  fatherName: string;
  cardIdx: number;
  cardName: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  score: number;
}

export interface KpiScoresPageProps {
  employeesOverride?: ReturnType<typeof getEmployees>;
  hideChrome?: boolean;
  heroTitle?: string;
  heroSubtitle?: string;
}

const KpiScoresPage = ({ employeesOverride, hideChrome, heroTitle, heroSubtitle }: KpiScoresPageProps = {}) => {
  const employees = useMemo(() => employeesOverride || getEmployees().filter(e => e.active), [employeesOverride]);

  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [month, setMonth] = useState<string>("May");
  const [selectedCards, setSelectedCards] = useState<string[]>([...KPI_CARDS]);
  const [cardSearch, setCardSearch] = useState("");
  const [cardOpen, setCardOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [viewEmp, setViewEmp] = useState<{ id: number; fullName: string; cardIdx: number; cardName: string } | null>(null);

  const filteredCardOpts = KPI_CARDS.filter(c => c.toLowerCase().includes(cardSearch.trim().toLowerCase()));
  const allSelected = selectedCards.length === KPI_CARDS.length;

  const toggleCard = (c: string) =>
    setSelectedCards(s => (s.includes(c) ? s.filter(x => x !== c) : [...s, c]));
  const toggleAll = () => setSelectedCards(allSelected ? [] : [...KPI_CARDS]);

  const rows: ScoreRow[] = useMemo(() => {
    if (selectedCards.length === 0) return [];
    const yr = Number(year);
    const mIdx = monthIdx(month);
    if (mIdx < 0) return [];
    const last = lastDayOfMonth(yr, mIdx);
    const periodLabel = `${month} ${yr}`;
    const startDate = `01.${pad(mIdx + 1)}.${yr}`;
    const endDate = `${pad(last)}.${pad(mIdx + 1)}.${yr}`;

    const out: ScoreRow[] = [];
    employees.forEach(emp => {
      selectedCards.forEach(card => {
        const cardIdx = KPI_CARDS.indexOf(card);
        out.push({
          empId: emp.id,
          fullName: `${emp.firstName} ${emp.lastName}`,
          fatherName: emp.fatherName ?? "",
          cardIdx,
          cardName: card,
          periodLabel,
          startDate,
          endDate,
          score: scoreFor(emp.id, cardIdx, yr, mIdx),
        });
      });
    });

    const q = globalSearch.trim().toLowerCase();
    if (!q) return out;
    return out.filter(r => r.fullName.toLowerCase().includes(q) || r.cardName.toLowerCase().includes(q));
  }, [employees, selectedCards, year, month, globalSearch]);

  const clearAll = () => {
    setSelectedCards([]);
    setCardSearch("");
    setGlobalSearch("");
  };

  return (
    <div className="min-h-screen">
      {!hideChrome && <Header title="KPI Nəticələri" />}
      <main className={hideChrome ? "" : "p-6 pb-24"}>
        {!hideChrome && (
          <PageHero
            badge="KPI Nəticələri"
            icon={BarChart3}
            title={heroTitle || "KPI Nəticələri"}
            subtitle={heroSubtitle || "Əməkdaşların KPI kartları üzrə qiymətləndirmə nəticələri"}
          />
        )}


        {/* Filter bar */}
        <div className="rounded-xl border border-border bg-card p-4 mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground">İl</label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-32 mt-1"><SelectValue placeholder="İl" /></SelectTrigger>
              <SelectContent>
                {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Ay</label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-40 mt-1"><SelectValue placeholder="Ay" /></SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[260px]">
            <label className="text-xs text-muted-foreground">KPI Kartları</label>
            <Popover open={cardOpen} onOpenChange={setCardOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="mt-1 w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border bg-background text-sm hover:bg-secondary/40"
                >
                  <span className="flex items-center gap-1 flex-wrap min-h-[1.25rem]">
                    {selectedCards.length === 0 ? (
                      <span className="text-muted-foreground">KPI kartı seçin...</span>
                    ) : (
                      <>
                        {selectedCards.slice(0, 2).map(c => (
                          <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                            {c}
                            <XIcon
                              className="w-3 h-3 cursor-pointer"
                              onClick={(e) => { e.stopPropagation(); toggleCard(c); }}
                            />
                          </span>
                        ))}
                        {selectedCards.length > 2 && (
                          <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                            +{selectedCards.length - 2}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="start">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      autoFocus
                      value={cardSearch}
                      onChange={(e) => setCardSearch(e.target.value)}
                      placeholder="KPI kartı axtar..."
                      className="w-full pl-8 pr-2 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 border-b border-border"
                >
                  <Checkbox checked={allSelected} />
                  <span className="font-medium">Hamısını seç</span>
                </button>
                <div className="max-h-64 overflow-y-auto">
                  {filteredCardOpts.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">Tapılmadı</div>
                  ) : filteredCardOpts.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleCard(c)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/40"
                    >
                      <Checkbox checked={selectedCards.includes(c)} />
                      <span>{c}</span>
                      {selectedCards.includes(c) && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={clearAll}>Təmizlə</Button>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Əməkdaş və ya KPI axtar..."
                className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring w-64"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Cəmi: {rows.length} nəticə</span>
              <ExportMenu
                size="sm"
                disabled={!rows.length}
                getData={() => ({
                  title: `KPI Qiymətləri ${month} ${year}`,
                  fileName: `kpi-qiymetleri-${year}-${month}`,
                  headers: ["Əməkdaşın A.S.A", "Ata adı", "KPI Kartının Adı", "Dövr", "Başlama tarixi", "Bitmə tarixi", "Qiymət (Bal)"],
                  rows: rows.map(r => [r.fullName, r.fatherName, r.cardName, r.periodLabel, r.startDate, r.endDate, `${r.score.toFixed(2)} / 5`]),
                })}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40">
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Əməkdaşın A.S.A.</th>
                  <th className="px-4 py-3 font-medium">Ata adı</th>
                  <th className="px-4 py-3 font-medium">KPI Kartının Adı</th>
                  <th className="px-4 py-3 font-medium">Dövr</th>
                  <th className="px-4 py-3 font-medium">Başlama Tarixi</th>
                  <th className="px-4 py-3 font-medium">Bitmə Tarixi</th>
                  <th className="px-4 py-3 font-medium">Qiymət (Bal)</th>
                  <th className="px-4 py-3 font-medium w-24">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody>
                {selectedCards.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    Cədvəli görmək üçün il, ay və ən azı bir KPI kartı seçin
                  </td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Nəticə tapılmadı</td></tr>
                ) : rows.map((r, i) => (
                  <tr key={`${r.empId}-${r.cardIdx}-${i}`} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-2.5 font-medium text-foreground">{r.fullName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.fatherName || "—"}</td>
                    <td className="px-4 py-2.5">{r.cardName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.periodLabel}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.startDate}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.endDate}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${scoreColor(r.score)}`}>
                        {r.score.toFixed(2)} / 5
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setViewEmp({ id: r.empId, fullName: r.fullName, cardIdx: r.cardIdx, cardName: r.cardName })}
                        title="Detallar"
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <EmployeeKpiDialog
        emp={viewEmp}
        year={Number(year)}
        mIdx={monthIdx(month)}
        periodLabel={`${month} ${year}`}
        onClose={() => setViewEmp(null)}
      />
    </div>
  );
};

// ===== Card goals catalog (real system goals) =====
const CARD_GOALS: Record<string, { name: string; target: number; unit: string; weight: number }[]> = {
  "Satış Həcmi": [
    { name: "Aylıq satış həcmi", target: 150000, unit: "AZN", weight: 45 },
    { name: "Yeni müqavilə sayı", target: 12, unit: "ədəd", weight: 30 },
    { name: "Ortalama sövdələşmə ölçüsü", target: 12500, unit: "AZN", weight: 25 },
  ],
  "Müştəri Məmnuniyyəti": [
    { name: "CSAT balı", target: 90, unit: "%", weight: 40 },
    { name: "NPS", target: 55, unit: "bal", weight: 35 },
    { name: "Şikayət cavab müddəti", target: 24, unit: "saat", weight: 25 },
  ],
  "Komanda İşi": [
    { name: "Komanda məmnuniyyət balı", target: 4.5, unit: "bal", weight: 40 },
    { name: "Cross-functional layihə iştirakı", target: 3, unit: "ədəd", weight: 30 },
    { name: "Peer review ortalaması", target: 4.3, unit: "bal", weight: 30 },
  ],
  "Vaxtında Tapşırıq Yerinə Yetirmə": [
    { name: "Vaxtında bitirilmə faizi", target: 95, unit: "%", weight: 50 },
    { name: "Gecikən tapşırıq sayı", target: 2, unit: "ədəd", weight: 25 },
    { name: "SLA uyğunluğu", target: 98, unit: "%", weight: 25 },
  ],
  "Peşəkar İnkişaf": [
    { name: "Tədris saatları", target: 20, unit: "saat", weight: 40 },
    { name: "Tamamlanmış sertifikatlar", target: 2, unit: "ədəd", weight: 35 },
    { name: "Daxili mentor saatları", target: 8, unit: "saat", weight: 25 },
  ],
  "Yeni Müştəri Cəlbi": [
    { name: "Yeni aktiv müştəri", target: 20, unit: "ədəd", weight: 45 },
    { name: "Lead-dən müştəriyə konversiya", target: 25, unit: "%", weight: 30 },
    { name: "Outbound zəng sayı", target: 200, unit: "ədəd", weight: 25 },
  ],
};

const isLowerBetter = (unit: string, name: string) =>
  /saat|gün|day|hour|şikayət|gecik/i.test(`${unit} ${name}`);

const goalScoreFor = (empId: number, cardIdx: number, goalIdx: number, year: number, mIdx: number) => {
  const seed = (empId * 41 + cardIdx * 13 + goalIdx * 7 + year + mIdx * 5) % 100;
  return Math.round((3 + (seed / 100) * 2) * 10) / 10; // 3.0..5.0
};

const actualFromScore = (target: number, score: number, lower: boolean) => {
  // score 5 → 100%, 3 → 70%, 1 → 40% (təxmini)
  const pct = 40 + (score / 5) * 60;
  const val = lower ? target / (pct / 100) : target * (pct / 100);
  const rounded = target >= 100 ? Math.round(val) : Math.round(val * 100) / 100;
  return rounded;
};

const fmtNum = (n: number) => new Intl.NumberFormat("az-AZ").format(n);

// ===== Employee detail dialog — bir KPI kartının daxili =====

const EmployeeKpiDialog = ({
  emp, year, mIdx, periodLabel, onClose,
}: {
  emp: { id: number; fullName: string; cardIdx: number; cardName: string } | null;
  year: number;
  mIdx: number;
  periodLabel: string;
  onClose: () => void;
}) => {
  const goals = emp ? (CARD_GOALS[emp.cardName] || []) : [];
  const rows = emp ? goals.map((g, gi) => {
    const score = goalScoreFor(emp.id, emp.cardIdx, gi, year, mIdx);
    const lower = isLowerBetter(g.unit, g.name);
    const actual = actualFromScore(g.target, score, lower);
    return { ...g, score, actual, lower, weighted: (g.weight / 100) * score };
  }) : [];
  const total = rows.reduce((s, r) => s + r.weighted, 0);

  return (
    <Dialog open={!!emp} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-primary" />
            {emp?.fullName} — {emp?.cardName}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">Dövr: {periodLabel} · Kart daxilindəki hədəflər və onların nəticə balları</p>
        </DialogHeader>

        {emp && (
          <div>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Hədəf</th>
                    <th className="px-3 py-2 font-medium text-right">Hədəf</th>
                    <th className="px-3 py-2 font-medium text-right">Faktiki</th>
                    <th className="px-3 py-2 font-medium text-right w-20">Çəki</th>
                    <th className="px-3 py-2 font-medium text-right w-24">Bal</th>
                    <th className="px-3 py-2 font-medium text-right w-32">Çəki × Bal</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Bu kart üçün hədəf tapılmadı</td></tr>
                  ) : rows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground">{r.name}</div>
                        <div className="text-[10px] text-muted-foreground">{r.lower ? "Az yaxşıdır" : "Çox yaxşıdır"}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(r.target)} {r.unit}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(r.actual)} {r.unit}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.weight}%</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${scoreColor(r.score)}`}>
                          {r.score.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium">
                        {(r.weight / 100).toFixed(2)} × {r.score.toFixed(2)} = <span className="text-primary">{r.weighted.toFixed(3)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-primary/30 bg-primary/5">
                      <td colSpan={3} className="px-3 py-2.5 text-right font-medium text-muted-foreground">Ümumi kart nəticəsi (çəkilərə görə):</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium">{rows.reduce((s, r) => s + r.weight, 0)}%</td>
                      <td colSpan={2} className="px-3 py-2.5 text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm border font-semibold ${scoreColor(total)}`}>
                          {total.toFixed(2)} / 5
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-secondary/40 border border-border text-[11px] font-mono text-muted-foreground">
              {rows.map(r => `(${r.weight}%×${r.score.toFixed(2)})`).join(" + ")} = <span className="text-primary font-bold">{total.toFixed(2)}</span> bal
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={onClose}>Bağla</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default KpiScoresPage;

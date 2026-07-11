import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "@/components/layout/Header";
import { TrendingUp, Target, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PageHero, FancyStatCard, FancyCard } from "@/components/ui/page-hero";
import { AIChatSection } from "@/components/ai/AIChatSection";
import PeriodPicker, { buildDemoSeries, currentPeriod, periodLabel, type PeriodValue } from "@/components/common/PeriodPicker";
import { useAuth } from "@/contexts/AuthContext";

// Localized "… Kartı" suffix so we don't stuff Azerbaijani copy in EN/RU rows.
const kartiSuffix = (lang: string) =>
  lang.startsWith("en") ? " Card" : lang.startsWith("ru") ? " (карточка)" : " Kartı";

type Row = {
  nameKey: string;
  assignType: "bulk" | "individual";
  createdAt: string;
  progress: number;
  responsible: string;
};

const rows: Row[] = [
  { nameKey: "home.row_monthly_sales",   assignType: "bulk",       createdAt: "12.01.2026", progress: 84, responsible: "Samir Həsənov" },
  { nameKey: "home.row_retail_sales",    assignType: "bulk",       createdAt: "05.02.2026", progress: 95, responsible: "Farid Həsənov" },
  { nameKey: "home.row_customer_acq",    assignType: "individual", createdAt: "18.03.2026", progress: 97, responsible: "Emin Məmmədov" },
  { nameKey: "home.row_customer_ret",    assignType: "bulk",       createdAt: "22.03.2026", progress: 98, responsible: "Leyla Həsənova" },
  { nameKey: "home.row_innovation",      assignType: "individual", createdAt: "07.04.2026", progress: 65, responsible: "Rəşad Əliyev" },
  { nameKey: "home.row_ops_efficiency",  assignType: "bulk",       createdAt: "14.05.2026", progress: 98, responsible: "Kamran Quliyev" },
  { nameKey: "home.row_complaints",      assignType: "individual", createdAt: "02.06.2026", progress: 40, responsible: "Nigar Hüseynova" },
];

const departments = [
  { key: "home.dept_sales",    value: 92, count: 8 },
  { key: "home.dept_it",       value: 88, count: 6 },
  { key: "home.dept_finance",  value: 85, count: 7 },
  { key: "home.dept_hr",       value: 78, count: 5 },
  { key: "home.dept_marketing",value: 82, count: 4 },
];

const HomePage = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodValue>(() => currentPeriod("year"));
  const chartData = useMemo(() => buildDemoSeries(period, 78), [period]);
  const subtitle = periodLabel(period);

  const suffix = kartiSuffix(i18n.language);
  const heroName = user?.name?.split(" ")[0] || t("home.default_admin");

  const stats = [
    { icon: TrendingUp, label: t("home.stat_total_perf"), value: "88.5%", sub: t("home.stat_total_perf_sub"), accent: "primary" as const },
    { icon: Target, label: t("home.stat_active_kpi"), value: "24", sub: t("home.stat_active_kpi_sub"), accent: "violet" as const },
    { icon: CheckCircle, label: t("home.stat_met_kpi"), value: "18", sub: t("home.stat_met_kpi_sub"), accent: "emerald" as const },
    { icon: AlertTriangle, label: t("home.stat_attention"), value: "3", sub: t("home.stat_attention_sub"), accent: "amber" as const },
  ];

  return (
    <div className="min-h-screen">
      <Header title={t("nav.home")} />
      <main className="p-6 pb-24">
        <PageHero
          badge={t("home.hero_badge")}
          icon={Sparkles}
          title={t("home.hero_title", { name: heroName })}
          subtitle={t("home.hero_subtitle")}
        />
        <AIChatSection />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {stats.map((s, i) => (
            <FancyStatCard key={i} icon={s.icon} label={s.label} value={s.value} sub={s.sub} accent={s.accent} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <FancyCard
            title={t("home.performance_dynamics")}
            subtitle={subtitle}
            className="lg:col-span-2"
            right={<PeriodPicker value={period} onChange={setPeriod} />}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="homeLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelFormatter={(l) => `${l} • ${subtitle}`}
                  formatter={(v: number) => [`${v}%`, t("home.tooltip_performance")]}
                />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </FancyCard>

          <FancyCard title={t("home.department_performance")}>
            <div className="space-y-4">
              {departments.map((d) => (
                <div key={d.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{t(d.key)}</span>
                    <span className="font-semibold text-primary">{d.value}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-primary/70 rounded-full h-2" style={{ width: `${d.value}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("home.active_kpis_count", { count: d.count })}</p>
                </div>
              ))}
            </div>
          </FancyCard>
        </div>

        <FancyCard title={t("home.recent_results")}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left border-b border-border">
                <th className="pb-3 font-medium">{t("home.col_name")}</th>
                <th className="pb-3 font-medium">{t("home.col_assign_type")}</th>
                <th className="pb-3 font-medium">{t("home.col_created")}</th>
                <th className="pb-3 font-medium">{t("home.col_responsible")}</th>
                <th className="pb-3 font-medium">{t("home.col_progress")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-3 font-medium text-foreground">{t(row.nameKey)}{suffix}</td>
                  <td className="py-3 text-muted-foreground">{row.assignType === "bulk" ? t("home.assign_bulk") : t("home.assign_individual")}</td>
                  <td className="py-3 text-muted-foreground">{row.createdAt}</td>
                  <td className="py-3 text-muted-foreground">{row.responsible}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-secondary rounded-full h-1.5">
                        <div className="bg-primary rounded-full h-1.5" style={{ width: `${row.progress}%` }} />
                      </div>
                      <span className="text-xs font-medium">{row.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </FancyCard>
      </main>
    </div>
  );
};

export default HomePage;

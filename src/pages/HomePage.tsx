import Header from "@/components/layout/Header";
import { TrendingUp, Target, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PageHero, FancyStatCard, FancyCard } from "@/components/ui/page-hero";
import { AIChatSection } from "@/components/ai/AIChatSection";

const chartData = [
  { month: "Yan", value: 65 }, { month: "Fev", value: 68 }, { month: "Mar", value: 70 },
  { month: "Apr", value: 72 }, { month: "May", value: 74 }, { month: "İyn", value: 76 },
  { month: "İyl", value: 78 }, { month: "Avq", value: 80 }, { month: "Sen", value: 82 },
  { month: "Okt", value: 84 }, { month: "Nov", value: 86 }, { month: "Dek", value: 88 },
];

const departments = [
  { name: "Satış", value: 92, count: 8 },
  { name: "İT", value: 88, count: 6 },
  { name: "Maliyyə", value: 85, count: 7 },
  { name: "HR", value: 78, count: 5 },
  { name: "Marketinq", value: 82, count: 4 },
];

const tableData = [
  { name: "Aylıq Satış Hədəfi", department: "Satış", target: "5M AZN", current: "4.2M AZN", progress: 84, responsible: "Samir Həsənov" },
  { name: "Parakəndə Satış", department: "Parakəndə", target: "2M AZN", current: "1.9M AZN", progress: 95, responsible: "Farid Həsənov" },
  { name: "Müştəri Əldə Etmə", department: "Marketinq", target: "500", current: "485", progress: 97, responsible: "Emin Məmmədov" },
  { name: "Müştəri Saxlama", department: "Müştəri Xidmətləri", target: "95%", current: "93%", progress: 98, responsible: "Leyla Həsənova" },
  { name: "İnnovasiya İndeksi", department: "R&D", target: "80%", current: "72%", progress: 65, responsible: "Rəşad Əliyev" },
  { name: "Əməliyyat Effektivliyi", department: "Əməliyyatlar", target: "90%", current: "88%", progress: 98, responsible: "Kamran Quliyev" },
  { name: "Müştəri Şikayətləri", department: "Müştəri Xidmətləri", target: "< 5%", current: "7%", progress: 40, responsible: "Nigar Hüseynova" },
];

const stats = [
  { icon: TrendingUp, label: "Ümumi Orta Performans", value: "88.5%", sub: "Keçən aya nisbətdə +4.5% artım", accent: "primary" as const },
  { icon: Target, label: "Aktiv KPI Sayı", value: "24", sub: "Ümumi 32 KPI-dan", accent: "violet" as const },
  { icon: CheckCircle, label: "Hədəfə Çatan KPI-lər", value: "18", sub: "75% müvəffəqiyyət nisbəti", accent: "emerald" as const },
  { icon: AlertTriangle, label: "Diqqət Tələb Edən", value: "3", sub: "Təcili müdaxilə lazımdır", accent: "amber" as const },
];

const HomePage = () => {
  return (
    <div className="min-h-screen">
      <Header title="Əsas Səhifə" />
      <main className="p-6 pb-24">
        <PageHero
          badge="İdarəetmə Mərkəzi"
          icon={Sparkles}
          title="Xoş gəlmisiniz, Admin"
          subtitle="KPI performans idarəetmə sistemi"
        />
        <AIChatSection />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {stats.map((s, i) => (
            <FancyStatCard key={i} icon={s.icon} label={s.label} value={s.value} sub={s.sub} accent={s.accent} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <FancyCard
            title="Performans Dinamikası"
            subtitle="Son 12 ay üzrə müqayisə"
            className="lg:col-span-2"
            right={
              <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
                <button className="px-3 py-1 text-xs rounded-md bg-primary text-primary-foreground">İl</button>
                <button className="px-3 py-1 text-xs rounded-md text-muted-foreground">Rüb</button>
                <button className="px-3 py-1 text-xs rounded-md text-muted-foreground">Ay</button>
              </div>
            }
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
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </FancyCard>

          <FancyCard title="Departament Performansı">
            <div className="space-y-4">
              {departments.map((d) => (
                <div key={d.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{d.name}</span>
                    <span className="font-semibold text-primary">{d.value}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-primary/70 rounded-full h-2" style={{ width: `${d.value}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.count} aktiv KPI</p>
                </div>
              ))}
            </div>
          </FancyCard>
        </div>

        <FancyCard title="Son KPI Nəticələri">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left border-b border-border">
                <th className="pb-3 font-medium">KPI Adı</th>
                <th className="pb-3 font-medium">Departament</th>
                <th className="pb-3 font-medium">Hədəf</th>
                <th className="pb-3 font-medium">Cari</th>
                <th className="pb-3 font-medium">Progress</th>
                <th className="pb-3 font-medium">Məsul</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-3 font-medium text-foreground">{row.name}</td>
                  <td className="py-3 text-muted-foreground">{row.department}</td>
                  <td className="py-3 text-foreground">{row.target}</td>
                  <td className="py-3 text-foreground">{row.current}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-secondary rounded-full h-1.5">
                        <div className="bg-primary rounded-full h-1.5" style={{ width: `${row.progress}%` }} />
                      </div>
                      <span className="text-xs font-medium">{row.progress}%</span>
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground">{row.responsible}</td>
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

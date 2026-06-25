import { useState } from "react";
import { Info, MoreHorizontal, Send } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";

export const KPI_EXTRA_TABS = [
  ["performance", "Performans Analitikası"],
  ["comments", "Şərhlər"],
] as const;

export type KpiExtraTabKey = typeof KPI_EXTRA_TABS[number][0];

export const isExtraTab = (t: string): t is KpiExtraTabKey =>
  KPI_EXTRA_TABS.some(([k]) => k === t);

interface Props {
  kpi: { name: string; target?: string | number; current?: string | number; unit?: string; progress: number };
  tab: KpiExtraTabKey;
}

const trend = [
  { m: "Okt 2025", f: 2.4, h: 5 },
  { m: "Noy 2025", f: 2.9, h: 5 },
  { m: "Dek 2025", f: 3.3, h: 5 },
  { m: "Yan 2026", f: 3.6, h: 5 },
  { m: "Fev 2026", f: 3.9, h: 5 },
  { m: "Mar 2026", f: 4.2, h: 5 },
];

export default function KpiExtraTabContent({ kpi, tab }: Props) {
  if (tab === "performance") return <Performance kpi={kpi} />;
  if (tab === "comments") return <Comments />;
  return null;
}

function StatCard({ label, value, sub, tone = "primary" }: { label: string; value: string; sub?: React.ReactNode; tone?: "primary" | "destructive" | "success" | "warning" }) {
  const tones: Record<string, string> = {
    primary: "text-primary",
    destructive: "text-destructive",
    success: "text-success",
    warning: "text-zone-yellow-text",
  };
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold mt-1 ${tones[tone]}`}>{value}</p>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function Performance({ kpi }: { kpi: Props["kpi"] }) {
  const pct = kpi.progress ?? 84;
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Performans Analitikası</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Cari nəticə" value="4.2M AZN" sub={<span className="text-success">{pct}%</span>} tone="success" />
        <StatCard label="Hədəf" value="5M AZN" tone="destructive" />
        <StatCard label="Çatışmayan" value="800K AZN" tone="destructive" />
        <StatCard label="Ay sonu proqnozu" value="4.8M AZN" sub={<span className="text-success">96%</span>} tone="primary" />
        <StatCard label="Risk səviyyəsi" value="Orta" tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-3">Trend (Son 6 ay)</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="m" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 12, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <ReferenceLine y={5} stroke="hsl(var(--destructive))" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="f" name="Faktiki" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary inline-block" /> Faktiki</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t border-dashed border-destructive inline-block" /> Hədəf</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-3">Hədəfə çatma sürəti</h4>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
                  strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{pct}%</span>
                <span className="text-[10px] text-muted-foreground">İcra faizi</span>
              </div>
            </div>
            <div className="space-y-2 text-sm flex-1">
              <Row dot="primary" label="Cari nəticə" value="4.2M AZN" />
              <Row dot="destructive" label="Hədəf" value="5M AZN" />
              <Row dot="success" label="İcra faizi" value={`${pct}%`} />
              <Row dot="muted" label="Çatışmayan" value="800K AZN" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-secondary/40 border border-border rounded-lg p-3 flex gap-2">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-foreground">Analiz qeydi</p>
          <p className="text-xs text-muted-foreground">Cari temp ilə ay sonunda 4.8M AZN nəticə gözlənilir. Hədəfə çatma ehtimalı 96%-dir.</p>
        </div>
      </div>
    </div>
  );
}

function Row({ dot, label, value }: { dot: string; label: string; value: string }) {
  const colors: Record<string, string> = {
    primary: "bg-primary", destructive: "bg-destructive", success: "bg-success", muted: "bg-muted-foreground",
  };
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-muted-foreground"><span className={`w-2 h-2 rounded-full ${colors[dot]}`} />{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function Evaluation() {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Qiymətləndirmə Məlumatları</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Qiymətləndirmə balı" value="84%" sub={<span className="text-success">Yaxşı</span>} tone="success" />
        <StatCard label="Bonus təsiri" value="25%" tone="primary" />
        <StatCard label="KPI çəkisi" value="30%" tone="primary" />
        <StatCard label="Hesablanmış bonus" value="850 AZN" tone="success" />
        <StatCard label="Qiymətləndirmə tarixi" value="15.07.2026" tone="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-3">Qiymətləndirmə məlumatı</h4>
          <div className="space-y-2 text-sm">
            {[
              ["Qiymətləndirən şəxs:", "HR Menecer"],
              ["Qiymətləndirmə dövrü:", "2026 - Aylıq"],
              ["Qiymətləndirmə metodu:", "Faiz (Nəticə əsaslı)"],
              ["Minimal bal:", "60%"],
              ["Keçid balı:", "70%"],
              ["Maksimum bal:", "100%"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium text-foreground">{v}</span></div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <h4 className="text-sm font-semibold mb-3">Bal səviyyələri</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-2 font-medium">Bal aralığı</th>
                <th className="text-left py-2 font-medium">Səviyyə</th>
                <th className="text-left py-2 font-medium">Təsvir</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["90% - 100%", "Əla", "Hədəfdən yüksək nəticə", "text-success"],
                ["70% - 89%", "Yaxşı", "Hədəfə uyğun nəticə", "text-primary"],
                ["60% - 69%", "Qənaətbəxş", "Hədəfə yaxın nəticə", "text-zone-yellow-text"],
                ["0% - 59%", "Zəif", "Hədəfdən aşağı nəticə", "text-destructive"],
              ].map(([r, l, d, c]) => (
                <tr key={r} className="border-b border-border last:border-0">
                  <td className="py-2 text-foreground">{r}</td>
                  <td className={`py-2 font-medium ${c}`}>{l}</td>
                  <td className="py-2 text-muted-foreground">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-secondary/40 border border-border rounded-lg p-3 flex gap-2">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Qeyd: </span>Qiymətləndirmə nəticəsi KPI-nin icra faizinə əsasən avtomatik hesablanır.</p>
      </div>
    </div>
  );
}

interface CommentItem { id: number; author: string; date: string; text: string; }
const seedComments: CommentItem[] = [
  { id: 1, author: "Admin", date: "01.03.2026 10:30", text: "Mart ayında kampaniyaların effektivliyi gözləniləndən yüksəkdir. Hədəfə çatma ehtimalı artıb." },
  { id: 2, author: "Samir Həsənov", date: "15.02.2026 16:45", text: "Yeni məhsul xəttinin satışları yaxşı nəticə verir. Mövsümi faktorlar nəzərə alınıb." },
  { id: 3, author: "Admin", date: "01.01.2026 09:15", text: "KPI yaradıldı və 2026 - Aylıq dövrü üçün aktiv edildi." },
];

function Comments() {
  const [items, setItems] = useState<CommentItem[]>(seedComments);
  const [text, setText] = useState("");
  const add = () => {
    if (!text.trim()) return;
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    setItems([{ id: Date.now(), author: "Admin", date: `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`, text }, ...items]);
    setText("");
  };
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Şərhlər və Qeydlər</h3>
      <div className="flex items-start gap-2">
        <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">A</div>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Qeyd əlavə et..." className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        <button onClick={add} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 flex items-center gap-1">
          <Send className="w-3.5 h-3.5" /> Qeyd əlavə et
        </button>
      </div>

      <div className="space-y-3">
        {items.map((c) => (
          <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${c.author === "Admin" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>{c.author[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{c.author}</p>
                  <p className="text-[11px] text-muted-foreground">{c.date}</p>
                </div>
                <button className="p-1 rounded hover:bg-secondary"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <p className="text-sm text-foreground mt-1">{c.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-secondary/40 border border-border rounded-lg p-3 flex gap-2">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Qeyd: </span>Şərhlər yalnız bu KPI ilə bağlı daxili qeydlər üçün nəzərdə tutulub.</p>
      </div>
    </div>
  );
}


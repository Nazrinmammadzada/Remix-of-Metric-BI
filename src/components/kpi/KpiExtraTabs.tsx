import { useState } from "react";
import { Info, MoreHorizontal, Send } from "lucide-react";


export const KPI_EXTRA_TABS = [
  ["comments", "Şərhlər"],
] as const;

export type KpiExtraTabKey = typeof KPI_EXTRA_TABS[number][0];

export const isExtraTab = (t: string): t is KpiExtraTabKey =>
  KPI_EXTRA_TABS.some(([k]) => k === t);

interface Props {
  kpi: { name: string; target?: string | number; current?: string | number; unit?: string; progress: number };
  tab: KpiExtraTabKey;
}

export default function KpiExtraTabContent({ kpi, tab }: Props) {
  if (tab === "comments") return <Comments />;
  return null;
}

// Performance / Evaluation / trend removed – Performans Analitikası tab-ı silinib.


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


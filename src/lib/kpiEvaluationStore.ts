// İstifadəçinin KPI kartı (bir ədəd) daxilində ona təyin olunmuş hədəf-lar.
// Hər hədəf: ad, hədəf, faktiki, ölçü vahidi, çəki, status (qiymətləndirilib / gözləyir),
// və əlavə qiymətləndirmə sahələri (çətinliklər, dəstəkləyici sübut, növbəti dövr planı).

import { useEffect, useState } from "react";

export interface SubKpi {
  id: string;
  assigneeId: string;       // employee id (e.g. e4 = MOCK_USER_ID)
  cardId: string;           // valideyn KPI kartı
  name: string;
  description: string;
  target: number;
  actual?: number;          // hələ qeyd edilməyibsə undefined
  unit: string;
  weight: number;           // kart daxilində çəki (%)
  period: string;
  // Qiymətləndirmə nəticəsi:
  evaluatedScore?: number;  // 0..5
  selfComment?: string;
  challenges?: string;      // qarşılaşılan çətinliklər
  evidence?: string;        // dəstəkləyici qeyd / link
  nextPlan?: string;        // növbəti dövr üçün tədbir planı
  submittedAt?: number;
}

export interface KpiCardInfo {
  id: string;
  assigneeId: string;
  name: string;
  period: string;
}

const KEY = "user_kpi_subkpis_v2";
const EVT = "user-kpi-subkpis-updated";

export const USER_KPI_CARD: KpiCardInfo = {
  id: "card-2026q1-e4",
  assigneeId: "e4",
  name: "2026 Q1 — Satış və Müştəri Uğuru Kartı",
  period: "2026 Q1",
};

const NOW = Date.now();

const SEED: SubKpi[] = [
  // 2 ədəd ARTIQ QİYMƏTLƏNDİRİLMİŞ
  {
    id: "skpi-1",
    assigneeId: "e4",
    cardId: USER_KPI_CARD.id,
    name: "Aylıq Satış Həcmi",
    description: "Cari rüb üçün şəxsi satış hədəfinin yerinə yetirilməsi.",
    target: 150000,
    actual: 162000,
    unit: "AZN",
    weight: 35,
    period: "2026 Q1",
    evaluatedScore: 5,
    selfComment: "Hədəfi 108% yerinə yetirdim, yeni korporativ müştərilər hesabına.",
    challenges: "Yanvar ayında bazarın yavaş açılması.",
    evidence: "CRM hesabatı #Q1-SAL-014",
    nextPlan: "Q2-də upsell kampaniyası ilə həcmi 175.000 AZN-ə çıxarmaq.",
    submittedAt: NOW - 86400000 * 3,
  },
  {
    id: "skpi-2",
    assigneeId: "e4",
    cardId: USER_KPI_CARD.id,
    name: "Yeni Müştəri Cəlbi",
    description: "Cari dövrdə cəlb edilən yeni aktiv müştərilərin sayı.",
    target: 20,
    actual: 18,
    unit: "ədəd",
    weight: 20,
    period: "2026 Q1",
    evaluatedScore: 4,
    selfComment: "Hədəfə 90% çatdım, 2 müştəri keçən rübə sürüşdü.",
    challenges: "Marketinq dəstəyinin gec başlaması.",
    evidence: "CRM lead-list ixracı",
    nextPlan: "Q2 üçün outbound sıxlığını həftəlik 15 zəngə qaldırmaq.",
    submittedAt: NOW - 86400000 * 2,
  },
  // 2 ədəd QİYMƏTLƏNDİRİLMƏSİ GÖZLƏNİLƏN
  {
    id: "skpi-3",
    assigneeId: "e4",
    cardId: USER_KPI_CARD.id,
    name: "Müştəri Məmnuniyyəti (CSAT)",
    description: "Rüblük sorğu ilə ölçülən müştəri məmnuniyyət göstəricisi.",
    target: 90,
    unit: "%",
    weight: 25,
    period: "2026 Q1",
  },
  {
    id: "skpi-4",
    assigneeId: "e4",
    cardId: USER_KPI_CARD.id,
    name: "Sifarişin Çatdırılma Vaxtı",
    description: "Sifarişin orta çatdırılma müddətinin azaldılması (az olması yaxşıdır).",
    target: 48,
    unit: "saat",
    weight: 20,
    period: "2026 Q1",
  },
];

const load = (): SubKpi[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(KEY, JSON.stringify(SEED));
  return SEED;
};

const persist = (rows: SubKpi[]) => {
  localStorage.setItem(KEY, JSON.stringify(rows));
  window.dispatchEvent(new Event(EVT));
};

export const getSubKpis = (assigneeId: string): SubKpi[] =>
  load().filter(k => k.assigneeId === assigneeId);

export const saveSubKpiEvaluation = (
  id: string,
  patch: Partial<Pick<SubKpi, "evaluatedScore" | "actual" | "selfComment" | "challenges" | "evidence" | "nextPlan">>,
) => {
  const list = load();
  persist(list.map(k => (k.id === id ? { ...k, ...patch, submittedAt: Date.now() } : k)));
};

export const useSubKpis = (assigneeId: string): SubKpi[] => {
  const [list, setList] = useState<SubKpi[]>(() => getSubKpis(assigneeId));
  useEffect(() => {
    const refresh = () => setList(getSubKpis(assigneeId));
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [assigneeId]);
  return list;
};

/** Yerinə yetirmə faizi (0–100+). actual yoxdursa 0 qaytarır. */
export const calcCompletion = (k: SubKpi): number => {
  if (k.actual === undefined || k.target <= 0) return 0;
  const lowerBetter = /saat|gün|day|hour/i.test(k.unit);
  const pct = lowerBetter ? (k.target / Math.max(1, k.actual)) * 100 : (k.actual / k.target) * 100;
  return Math.max(0, pct);
};

/** Faizdən 0–5 bala konvertasiya (avtomatik təklif). */
export const completionToScore = (pct: number): number => {
  if (pct >= 100) return 5;
  if (pct >= 90) return 4;
  if (pct >= 75) return 3;
  if (pct >= 60) return 2;
  if (pct >= 40) return 1;
  return 0;
};

export const isEvaluated = (k: SubKpi) => k.evaluatedScore !== undefined;

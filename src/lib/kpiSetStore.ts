// KPI Set modulu — KPI kartında rəhbərə təyin olunmuş (delegated) və ya HR-in özünün təyin etdiyi
// hədəf-lar üçün QİYMƏT LİMİTLƏRİNİN müəyyən edilməsi.
// Hər sətir bir hədəf-ya uyğundur və 5 səviyyəli aralıq saxlayır (l1..l5).
// Limitlər təyin olunduqda status "completed" olur, əks halda "pending".

import { useEffect, useState } from "react";

export type LimitTier = "l1" | "l2" | "l3" | "l4" | "l5";

export interface LimitRange {
  /** Aralığın aşağı həddi (daxil) */
  min: number;
  /** Aralığın yuxarı həddi (daxil) */
  max: number;
}

export type LimitSet = Record<LimitTier, LimitRange>;

/** Dinamik (N-tier) bal aralığı — qiymətləndirmə şablonundan N bala uyğun N sətir */
export interface DynamicTier {
  score: number;
  label: string;
  min: number;
  max: number;
}

export interface KpiSetEntry {
  id: string;
  cardId: number;
  cardName: string;
  subKpiId: number;
  subKpiName: string;
  target: string;
  unit: string;
  assigneeId?: number;
  assigneeName: string;
  /** Hədəf-nı kim təyin edir: HR (özü) və ya rəhbər */
  ownerType: "manager" | "hr";
  status: "pending" | "completed";
  limits?: LimitSet;
  /** Dinamik aralıq (qeyri-default bal şablonu istifadə olunduqda) */
  dynamicLimits?: DynamicTier[];
  /** Hədəf-nın çəkisi (%). Min/Max məhdudiyyəti varsa, weight bu aralıqda olmalıdır. */
  weight?: number;
  weightMin?: number;
  weightMax?: number;
  /** Bu hədəf paylaşıla bilərmi? (Cascading modulunda komandaya bölünür) */
  cascadable?: boolean;
  updatedAt: number;
}


const KEY = "kpi_set_entries_v3";
const EVT = "kpi-set-updated";

const SEED: KpiSetEntry[] = [
  // ---- Gözləyənlər (rəhbər hədəf adını, hədəfini, vahidi və limiti təyin edəcək) ----
  {
    id: "ks-1",
    cardId: 1,
    cardName: "Aylıq Satış Hədəfi",
    subKpiId: 101,
    subKpiName: "",
    target: "",
    unit: "",
    assigneeId: 11,
    assigneeName: "Samir Həsənov",
    ownerType: "manager",
    status: "pending",
    weightMin: 10,
    weightMax: 30,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: "ks-2",
    cardId: 1,
    cardName: "Aylıq Satış Hədəfi",
    subKpiId: 102,
    subKpiName: "",
    target: "",
    unit: "",
    assigneeId: 12,
    assigneeName: "Leyla Məmmədova",
    ownerType: "manager",
    status: "pending",
    weightMin: 15,
    weightMax: 40,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: "ks-3",
    cardId: 3,
    cardName: "Müştəri Əldə Etmə",
    subKpiId: 301,
    subKpiName: "",
    target: "",
    unit: "",
    assigneeId: 21,
    assigneeName: "Günel Əlizadə",
    ownerType: "hr",
    status: "pending",
    weightMin: 5,
    weightMax: 25,
    updatedAt: Date.now() - 3600000 * 5,
  },

  // ---- Tamamlanmışlar ----
  {
    id: "ks-4",
    cardId: 1,
    cardName: "Aylıq Satış Hədəfi",
    subKpiId: 103,
    subKpiName: "Online Satış",
    target: "50000",
    unit: "AZN",
    assigneeId: 13,
    assigneeName: "Rəşad Əliyev",
    ownerType: "manager",
    status: "completed",
    cascadable: true,
    limits: {
      l5: { min: 40001, max: 50000 },
      l4: { min: 30001, max: 40000 },
      l3: { min: 20001, max: 30000 },
      l2: { min: 10001, max: 20000 },
      l1: { min: 0, max: 10000 },
    },
    updatedAt: Date.now() - 86400000 * 4,
  },
  {
    id: "ks-5",
    cardId: 3,
    cardName: "Müştəri Əldə Etmə",
    subKpiId: 302,
    subKpiName: "Referral Müştərilər",
    target: "150",
    unit: "ədəd",
    assigneeId: 22,
    assigneeName: "Emin Məmmədov",
    ownerType: "hr",
    status: "completed",
    cascadable: true,
    limits: {
      l5: { min: 121, max: 150 },
      l4: { min: 91, max: 120 },
      l3: { min: 61, max: 90 },
      l2: { min: 31, max: 60 },
      l1: { min: 0, max: 30 },
    },
    updatedAt: Date.now() - 86400000 * 6,
  },
];

const load = (): KpiSetEntry[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(KEY, JSON.stringify(SEED));
  return SEED;
};

const persist = (rows: KpiSetEntry[]) => {
  localStorage.setItem(KEY, JSON.stringify(rows));
  window.dispatchEvent(new Event(EVT));
};

export const getKpiSetEntries = (): KpiSetEntry[] => load();

export const getLimitsFor = (cardId: number, subKpiId: number): LimitSet | undefined =>
  load().find(e => e.cardId === cardId && e.subKpiId === subKpiId)?.limits;

export const setEntryLimits = (id: string, limits: LimitSet) => {
  persist(load().map(e => (e.id === id ? { ...e, limits, status: "completed", updatedAt: Date.now() } : e)));
};

/** Rəhbərin pending entry üçün hədəf ad/hədəf/vahid/limit/cascadable/çəki/dinamik aralıq təyin etməsi. */
export const setEntryDetails = (
  id: string,
  patch: {
    subKpiName?: string; target?: string; unit?: string;
    limits?: LimitSet; cascadable?: boolean;
    weight?: number; dynamicLimits?: DynamicTier[];
  }
) => {
  persist(load().map(e => {
    if (e.id !== id) return e;
    const next = { ...e, ...patch, updatedAt: Date.now() };
    if ((next.limits || (next.dynamicLimits && next.dynamicLimits.length)) && next.subKpiName && next.target) next.status = "completed";
    return next;
  }));
};


/** Bir KPI kartına aid bütün KPI Set entry-ləri (tamamlanmışlar — hədəf kimi göstərmək üçün). */
export const getEntriesForCard = (cardId: number): KpiSetEntry[] =>
  load().filter(e => e.cardId === cardId);

export const clearEntryLimits = (id: string) => {
  persist(load().map(e => (e.id === id ? { ...e, limits: undefined, status: "pending", updatedAt: Date.now() } : e)));
};

/** Hədəfdən avtomatik 5 səviyyəli aralıq təklif et (bərabər bölgü). */
export const suggestLimitsFromTarget = (target: string): LimitSet => {
  const num = parseFloat(String(target).replace(/[^\d.\-]/g, "")) || 0;
  const step = num / 5;
  const round = (n: number) => Math.round(n);
  return {
    l1: { min: 0, max: round(step) },
    l2: { min: round(step) + 1, max: round(step * 2) },
    l3: { min: round(step * 2) + 1, max: round(step * 3) },
    l4: { min: round(step * 3) + 1, max: round(step * 4) },
    l5: { min: round(step * 4) + 1, max: round(num) },
  };
};

export const useKpiSet = (): KpiSetEntry[] => {
  const [rows, setRows] = useState<KpiSetEntry[]>(() => load());
  useEffect(() => {
    const refresh = () => setRows(load());
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return rows;
};

export const TIER_LABELS: { tier: LimitTier; score: number; label: string }[] = [
  { tier: "l5", score: 5, label: "Əla (5 bal)" },
  { tier: "l4", score: 4, label: "Yaxşı (4 bal)" },
  { tier: "l3", score: 3, label: "Orta (3 bal)" },
  { tier: "l2", score: 2, label: "Zəif (2 bal)" },
  { tier: "l1", score: 1, label: "Çox zəif (1 bal)" },
];

export const ZERO_LIMITS: LimitSet = {
  l1: { min: 0, max: 0 },
  l2: { min: 0, max: 0 },
  l3: { min: 0, max: 0 },
  l4: { min: 0, max: 0 },
  l5: { min: 0, max: 0 },
};

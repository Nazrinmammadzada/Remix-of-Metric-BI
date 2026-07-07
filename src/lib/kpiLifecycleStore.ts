// KPI Lifecycle saxlama — hər KPI kartı üçün planlama mərhələləri.
// localStorage-də saxlanılır, dəyişiklikləri "kpi-lifecycle-updated" eventi ilə bildirir.

import { useEffect, useState } from "react";

export interface LifecycleStage {
  period: string; // dropdown catalog dəyəri (statik) və ya "Digər"
  /** period === "Digər" olduqda kpi_periods kataloqundan seçilmiş dövrün id-si */
  customPeriodId?: number;
  /** "Digər" seçildikdə göstərilən etiket (məs. "6 ay (16.06.2026 — 16.12.2026)") */
  customPeriodLabel?: string;
  start: string;  // YYYY-MM-DD
  end: string;    // YYYY-MM-DD
}

export interface LifecycleReview extends LifecycleStage {
  id: string;
}

export interface CardLifecycle {
  cardId: number;
  cardName: string;
  assignment?: LifecycleStage;
  evaluation?: LifecycleStage;
  bonus?: LifecycleStage;
  reviews: LifecycleReview[];
  updatedAt: string;
}

const KEY = "kpi_lifecycle_v2";
const EVT = "kpi-lifecycle-updated";

const SEED: CardLifecycle[] = [
  {
    cardId: 1,
    cardName: "Aylıq Satış Hədəfi",
    assignment: { period: "Aylıq", start: "2026-01-01", end: "2026-01-05" },
    evaluation: { period: "Aylıq", start: "2026-01-25", end: "2026-01-31" },
    bonus: { period: "Aylıq", start: "2026-02-01", end: "2026-02-05" },
    reviews: [
      { id: "r1", period: "Həftəlik", start: "2026-01-08", end: "2026-01-08" },
      { id: "r2", period: "Həftəlik", start: "2026-01-15", end: "2026-01-15" },
    ],
    updatedAt: new Date().toISOString(),
  },
  {
    cardId: 3,
    cardName: "Müştəri Əldə Etmə",
    assignment: { period: "Aylıq", start: "2026-03-01", end: "2026-03-03" },
    evaluation: { period: "Aylıq", start: "2026-03-25", end: "2026-03-31" },
    bonus: { period: "Rüblük", start: "2026-04-01", end: "2026-04-05" },
    reviews: [
      { id: "r1", period: "Aylıq", start: "2026-03-15", end: "2026-03-15" },
    ],
    updatedAt: new Date().toISOString(),
  },
  {
    cardId: 4,
    cardName: "Müştəri Saxlama Nisbəti",
    assignment: { period: "Rüblük", start: "2026-01-01", end: "2026-01-10" },
    evaluation: { period: "Rüblük", start: "2026-03-20", end: "2026-03-31" },
    bonus: { period: "Rüblük", start: "2026-04-01", end: "2026-04-10" },
    reviews: [],
    updatedAt: new Date().toISOString(),
  },
];

const load = (): CardLifecycle[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as CardLifecycle[];
  } catch {}
  localStorage.setItem(KEY, JSON.stringify(SEED));
  return SEED;
};

const persist = (list: CardLifecycle[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
};

export const getAllLifecycles = (): CardLifecycle[] => load();

export const getLifecycle = (cardId: number): CardLifecycle | undefined =>
  load().find(l => l.cardId === cardId);

/**
 * Kartın öz startDate/endDate/frequency-sinə əsasən lifecycle qaytarır.
 * Real yazılmış lifecycle varsa onu, yoxdursa avtomatik doldurulmuş nümunə qaytarır.
 * Qaralama statuslu kartlarda istifadə edilməməlidir.
 */
export const getLifecycleWithFallback = (
  cardId: number,
  cardName: string,
  meta?: { startDate?: string; endDate?: string; frequency?: string },
): CardLifecycle => {
  const existing = getLifecycle(cardId);
  if (existing) return existing;
  const start = meta?.startDate || "";
  const end = meta?.endDate || "";
  const period = meta?.frequency || "Aylıq";
  return {
    cardId,
    cardName,
    assignment: { period, start, end: start || end },
    evaluation: { period, start: end, end },
    bonus: { period, start: end, end },
    reviews: [],
    updatedAt: new Date().toISOString(),
  };
};


export const setCardLifecycle = (
  cardId: number,
  cardName: string,
  data: Omit<CardLifecycle, "cardId" | "cardName" | "updatedAt">,
) => {
  const list = load();
  const entry: CardLifecycle = {
    cardId,
    cardName,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  const next = list.some(l => l.cardId === cardId)
    ? list.map(l => (l.cardId === cardId ? entry : l))
    : [...list, entry];
  persist(next);
};

export const removeCardLifecycle = (cardId: number) => {
  persist(load().filter(l => l.cardId !== cardId));
};

export const useKpiLifecycles = (): CardLifecycle[] => {
  const [list, setList] = useState<CardLifecycle[]>(() => load());
  useEffect(() => {
    const r = () => setList(load());
    window.addEventListener(EVT, r);
    window.addEventListener("storage", r);
    return () => {
      window.removeEventListener(EVT, r);
      window.removeEventListener("storage", r);
    };
  }, []);
  return list;
};

export const emptyLifecycleDraft = (): Omit<CardLifecycle, "cardId" | "cardName" | "updatedAt"> => ({
  assignment: undefined,
  evaluation: undefined,
  bonus: undefined,
  reviews: [],
});

export const formatStagePeriod = (s?: LifecycleStage): string => {
  if (!s) return "—";
  if (s.period === "Digər" && s.customPeriodLabel) return s.customPeriodLabel;
  return s.period || "—";
};

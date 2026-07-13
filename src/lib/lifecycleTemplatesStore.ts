// Lifecycle şablonları — KPI Lifecycle planlarını şablon kimi yadda saxlayıb yenidən tətbiq etmək üçün.
import { useEffect, useState } from "react";
import type { CardLifecycle, LifecycleStage, LifecycleReview } from "./kpiLifecycleStore";

export interface LifecycleTemplateData {
  assignment?: LifecycleStage;
  evaluation?: LifecycleStage;
  bonus?: LifecycleStage;
  reviews: LifecycleReview[];
  /** Marker for dynamic date computation (e.g. "monthly-standard") */
  dynamic?: string;
}

export interface LifecycleTemplate {
  id: string;
  name: string;
  description?: string;
  data: LifecycleTemplateData;
  createdAt: string;
  isSystem?: boolean;
  active: boolean;
}

const KEY = "kpi_lifecycle_templates_v2";
const LEGACY_KEY = "kpi_lifecycle_templates_v1";
const EVT = "kpi-lifecycle-templates-updated";

const STANDARD_ID = "tpl-standard-monthly";

const buildStandardSeed = (): LifecycleTemplate => ({
  id: STANDARD_ID,
  name: "Standart Aylıq KPI Lifecycle",
  description:
    "Aylıq KPI-lar üçün default şablon. Tarixlər KPI-ın yaradıldığı tarixə əsasən avtomatik hesablanır.",
  isSystem: true,
  active: true,
  createdAt: new Date().toISOString(),
  data: {
    assignment: { period: "Aylıq", start: "", end: "" },
    evaluation: { period: "Aylıq", start: "", end: "" },
    bonus: { period: "Aylıq", start: "", end: "" },
    reviews: [{ id: "r-standard", period: "Aylıq", start: "", end: "" }],
    dynamic: "monthly-standard",
  },
});

const load = (): LifecycleTemplate[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw) as LifecycleTemplate[];
      // Ensure standard template is always present
      if (!list.some(t => t.id === STANDARD_ID)) {
        const next = [buildStandardSeed(), ...list];
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
      }
      return list;
    }
    // Migrate legacy
    let legacy: LifecycleTemplate[] = [];
    try {
      const lraw = localStorage.getItem(LEGACY_KEY);
      if (lraw) {
        const parsed = JSON.parse(lraw);
        if (Array.isArray(parsed)) {
          legacy = parsed.map((t: any) => ({
            ...t,
            active: t.active ?? true,
            isSystem: false,
          }));
        }
      }
    } catch {}
    const seeded = [buildStandardSeed(), ...legacy];
    localStorage.setItem(KEY, JSON.stringify(seeded));
    return seeded;
  } catch {
    return [buildStandardSeed()];
  }
};

const persist = (list: LifecycleTemplate[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
};

export const getLifecycleTemplates = (): LifecycleTemplate[] => load();

export const addLifecycleTemplate = (
  t: Omit<LifecycleTemplate, "id" | "createdAt" | "active"> & { active?: boolean },
) => {
  const list = load();
  const entry: LifecycleTemplate = {
    ...t,
    active: t.active ?? true,
    id: `tpl-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  persist([entry, ...list]);
  return entry;
};

export const updateLifecycleTemplate = (
  id: string,
  patch: Partial<Omit<LifecycleTemplate, "id" | "createdAt">>,
) => {
  const list = load().map(t => (t.id === id ? { ...t, ...patch } : t));
  persist(list);
};

export const toggleLifecycleTemplateActive = (id: string) => {
  const list = load().map(t => (t.id === id ? { ...t, active: !t.active } : t));
  persist(list);
};

export const deleteLifecycleTemplate = (id: string) => {
  const list = load();
  const target = list.find(t => t.id === id);
  if (target?.isSystem) return; // system şablonu silinmir
  persist(list.filter(t => t.id !== id));
};

export const useLifecycleTemplates = (): LifecycleTemplate[] => {
  const [list, setList] = useState<LifecycleTemplate[]>(() => load());
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

// ---- Dynamic date computation ----
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseISO = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
const addDays = (d: Date, days: number): Date => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + days);
  return nd;
};
const endOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth() + 1, 0);

/**
 * Standart aylıq KPI Lifecycle tarix hesablaması.
 * createdAtISO — KPI-ın yaradıldığı tarix (YYYY-MM-DD).
 */
export const computeStandardMonthlyLifecycle = (
  createdAtISO: string,
): Omit<CardLifecycle, "cardId" | "cardName" | "updatedAt"> => {
  const created = createdAtISO ? parseISO(createdAtISO) : new Date();
  const monthEnd = endOfMonth(created);

  const assignStart = created;
  const assignEnd = addDays(created, 2);

  const reviewStart = addDays(assignEnd, 1);
  const reviewEnd = addDays(reviewStart, 5);

  const evalStart = addDays(monthEnd, -5);
  const evalEnd = addDays(monthEnd, -2);

  const bonusStart = addDays(evalEnd, 1);
  const bonusEnd = monthEnd;

  return {
    assignment: { period: "Aylıq", start: toISO(assignStart), end: toISO(assignEnd) },
    evaluation: { period: "Aylıq", start: toISO(evalStart), end: toISO(evalEnd) },
    bonus: { period: "Aylıq", start: toISO(bonusStart), end: toISO(bonusEnd) },
    reviews: [{ id: "r-standard", period: "Aylıq", start: toISO(reviewStart), end: toISO(reviewEnd) }],
  };
};

/**
 * Şablonu tətbiq edərək CardLifecycle datası qaytarır.
 * Dinamik şablonlar üçün createdAt tarixinə əsasən hesablama edilir.
 */
export const resolveTemplateLifecycle = (
  tpl: LifecycleTemplate,
  createdAtISO: string,
): Omit<CardLifecycle, "cardId" | "cardName" | "updatedAt"> => {
  if (tpl.data.dynamic === "monthly-standard") {
    return computeStandardMonthlyLifecycle(createdAtISO);
  }
  const { dynamic: _d, ...rest } = tpl.data;
  return rest;
};

export const STANDARD_MONTHLY_TEMPLATE_ID = STANDARD_ID;

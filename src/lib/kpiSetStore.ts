// KPI Set modulu — KPI kartında rəhbərə təyin olunmuş (delegated) və ya HR-in özünün təyin etdiyi
// hədəf-lar üçün QİYMƏT LİMİTLƏRİNİN müəyyən edilməsi.
// Hər sətir bir hədəf-ya uyğundur və 5 səviyyəli aralıq saxlayır (l1..l5).
// Limitlər təyin olunduqda status "completed" olur, əks halda "pending".

import { useEffect, useState } from "react";
import { getNodes as getCascadeNodes, getChildren as getCascadeChildren } from "./cascadeTreeStore";


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

export interface ScoreDescRow {
  score: number;
  description?: string;
  timeStart?: string;
  timeEnd?: string;
}

export type KpiEntryType =
  | "Məbləğ" | "Say" | "İcra" | "Səriştə" | "Fərdi İnkişaf"
  | "Faiz" | "Nisbət" | "Boolean" | "Zaman";

export interface KpiSetEntry {
  id: string;
  cardId: number;
  cardName: string;
  subKpiId: number;
  subKpiName: string;
  /** Hədəfin növü (Məbləğ, Say, Faiz, ...) */
  type?: KpiEntryType;
  target: string;
  unit: string;
  assigneeId?: number;
  assigneeName: string;
  ownerType: "manager" | "hr";
  status: "pending" | "completed";
  limits?: LimitSet;
  dynamicLimits?: DynamicTier[];
  scoreDescriptions?: ScoreDescRow[];
  weight?: number;
  weightMin?: number;
  weightMax?: number;
  cascadable?: boolean;
  /** KPI kartında seçilmiş assignee-lərin adları — kaskad bölgüsündə yalnız
   *  bu şəxslər (və ya struktur rəhbərləri) görünə bilər. */
  cardAssignees?: string[];
  /** KPI kartında seçilmiş strukturların adları — kaskad bölgüsündə yalnız bu
   *  strukturların rəhbərləri görünə bilər. */
  cardStructures?: string[];
  updatedAt: number;
}


const KEY = "kpi_set_entries_v9";
const EVT = "kpi-set-updated";

const LEGACY_KEYS = ["kpi_set_entries_v8", "kpi_set_entries_v7", "kpi_set_entries_v6", "kpi_set_entries_v5", "kpi_set_entries_v4", "kpi_set_entries_v3", "kpi_set_entries_v2", "kpi_set_entries_v1"];

const DEMO_UPDATED_AT = Date.now() - 1000 * 60 * 60 * 24 * 7;
const SEED: KpiSetEntry[] = [
  {
    id: "demo-kset-elvin-roi",
    cardId: 91001,
    cardName: "Marketinq Kampaniyalarının ROI-si",
    subKpiId: 9100101,
    subKpiName: "ROI gəliri",
    type: "Məbləğ",
    target: "750000",
    unit: "AZN",
    assigneeId: 4,
    assigneeName: "Elvin Rəhimov",
    ownerType: "manager",
    status: "completed",
    weight: 40,
    cascadable: true,
    cardAssignees: ["Kamran Quliyev", "Orxan Bayramov"],
    cardStructures: ["Rəqəmsal Marketinq Şöbəsi"],
    updatedAt: DEMO_UPDATED_AT,
  },
  {
    id: "demo-kset-kamran-roi",
    cardId: 91001,
    cardName: "Marketinq Kampaniyalarının ROI-si",
    subKpiId: 9100102,
    subKpiName: "Rəqəmsal kampaniya gəliri",
    type: "Məbləğ",
    target: "350000",
    unit: "AZN",
    assigneeId: 7,
    assigneeName: "Kamran Quliyev",
    ownerType: "manager",
    status: "completed",
    weight: 35,
    cascadable: true,
    cardAssignees: ["Orxan Bayramov"],
    cardStructures: ["Rəqəmsal Marketinq Şöbəsi"],
    updatedAt: DEMO_UPDATED_AT + 1,
  },
];

const mergeSeedRows = (rows: KpiSetEntry[]): KpiSetEntry[] => {
  const ids = new Set(rows.map(r => r.id));
  const missing = SEED.filter(r => !ids.has(r.id));
  return missing.length ? [...missing, ...rows] : rows;
};


const load = (): KpiSetEntry[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const rows = mergeSeedRows(JSON.parse(raw));
      localStorage.setItem(KEY, JSON.stringify(rows));
      return rows;
    }
    for (const legacyKey of LEGACY_KEYS) {
      const legacy = localStorage.getItem(legacyKey);
      if (!legacy) continue;
      const rows = mergeSeedRows(JSON.parse(legacy));
      localStorage.setItem(KEY, JSON.stringify(rows));
      return rows;
    }
  } catch {}
  const rows = mergeSeedRows([]);
  localStorage.setItem(KEY, JSON.stringify(rows));
  return rows;
};


const persist = (rows: KpiSetEntry[]) => {
  localStorage.setItem(KEY, JSON.stringify(rows));
  window.dispatchEvent(new Event(EVT));
};

export const getKpiSetEntries = (): KpiSetEntry[] => load();

/** Yeni pending entry əlavə et — HR kart yaradarkən rəhbərin "Məsul olduğum kartlar"-ında görünsün deyə. */
export const addPendingEntry = (input: {
  cardId: number;
  cardName: string;
  assigneeName: string;
  assigneeId?: number;
  ownerType?: "manager" | "hr";
  status?: "pending" | "completed";
  subKpiName?: string;
  type?: KpiEntryType;
  target?: string;
  weight?: number;
  cascadable?: boolean;
  weightMin?: number;
  weightMax?: number;
  unit?: string;
  cardAssignees?: string[];
  cardStructures?: string[];
}): KpiSetEntry => {
  const list = load();
  const dupe = list.find(e => e.cardId === input.cardId && e.assigneeName === input.assigneeName);
  if (dupe) {
    // Yeniləyirik ki, sonrakı yaradılışlarda cardAssignees/cardStructures artmış olsa əks olunsun.
    const updated = {
      ...dupe,
      assigneeId: input.assigneeId ?? dupe.assigneeId,
      subKpiName: input.subKpiName ?? dupe.subKpiName,
      type: input.type ?? dupe.type,
      target: input.target ?? dupe.target,
      unit: input.unit ?? dupe.unit,
      ownerType: input.ownerType ?? dupe.ownerType,
      status: input.status ?? dupe.status,
      weight: input.weight ?? dupe.weight,
      cascadable: input.cascadable ?? dupe.cascadable,
      weightMin: input.weightMin ?? dupe.weightMin,
      weightMax: input.weightMax ?? dupe.weightMax,
      cardAssignees: input.cardAssignees ?? dupe.cardAssignees,
      cardStructures: input.cardStructures ?? dupe.cardStructures,
      updatedAt: Date.now(),
    };
    persist(list.map(e => e.id === dupe.id ? updated : e));
    return updated;
  }
  const entry: KpiSetEntry = {
    id: `ks-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    cardId: input.cardId,
    cardName: input.cardName,
    subKpiId: Date.now(),
    subKpiName: input.subKpiName || "",
    type: input.type,
    target: input.target || "",
    unit: input.unit || "",
    assigneeId: input.assigneeId,
    assigneeName: input.assigneeName,
    ownerType: input.ownerType || "manager",
    status: input.status || "pending",
    weight: input.weight,
    cascadable: input.cascadable,
    weightMin: input.weightMin,
    weightMax: input.weightMax,
    cardAssignees: input.cardAssignees,
    cardStructures: input.cardStructures,
    updatedAt: Date.now(),
  };
  persist([entry, ...list]);
  return entry;
};

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
    type?: KpiEntryType;
    limits?: LimitSet; cascadable?: boolean;
    weight?: number; dynamicLimits?: DynamicTier[];
    scoreDescriptions?: ScoreDescRow[];
  }
) => {
  persist(load().map(e => {
    if (e.id !== id) return e;
    const next = { ...e, ...patch, updatedAt: Date.now() };
    const hasLimits = !!(next.limits || (next.dynamicLimits && next.dynamicLimits.length) || (next.scoreDescriptions && next.scoreDescriptions.length));
    if (hasLimits && next.subKpiName && next.target) next.status = "completed";
    return next;
  }));
};

/**
 * Cari şəxsə yuxarı rəhbərdən gələn "Cascade Load".
 * Əvvəlcə cascade ağacında bu şəxsin gələn node-una baxırıq (əsas mənbə).
 * Yalnız orada tapılmasa, geriyə uyğunluq üçün köhnə kpi set entry-lərinə baxırıq.
 */
export const getIncomingCascadeLoad = (
  assigneeName: string,
  excludeCardId?: number,
  assigneeId?: number,
): { value: number; unit: string; cardName: string; remaining: number } | null => {
  // 1) cascade tree əsas mənbə
  if (assigneeId != null) {
    const currentEntry = excludeCardId != null
      ? load().find(e => e.cardId === excludeCardId && (e.assigneeId === assigneeId || e.assigneeName === assigneeName))
      : undefined;
    let list = getCascadeNodes().filter(n => n.assigneeId === assigneeId);
    if (currentEntry?.cardName) {
      const sameCard = list.filter(n => n.cardName === currentEntry.cardName);
      if (sameCard.length) list = sameCard;
    }
    if (list.length) {
      const node = [...list].sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))[0];
      const total = Number(node.limit) || 0;
      const distributed = getCascadeChildren(node.id).reduce((s, c) => s + (Number(c.limit) || 0), 0);
      return { value: total, unit: node.unit || "AZN", cardName: node.cardName, remaining: Math.max(0, total - distributed) };
    }
  }

  // 2) Geri uyğunluq — köhnə kpi set entry-lərindən
  const list = load().filter(e =>
    e.assigneeName === assigneeName &&
    e.cascadable &&
    e.status === "completed" &&
    (excludeCardId == null || e.cardId !== excludeCardId)
  );
  if (!list.length) return null;
  const first = list[0];
  const num = parseFloat(String(first.target).replace(/[^\d.\-]/g, "")) || 0;
  return { value: num, unit: first.unit, cardName: first.cardName, remaining: num };
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

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
  /** Wizard hədəfi ilə sabit əlaqə — eyni kartda eyni rəhbərə bir neçə hədəf düşəndə ayrım üçün. */
  sourceTargetId?: string;
  /** Cascade tree node-u ilə əlaqə — rəhbər növbəti səviyyəyə eyni node-dan davam etsin. */
  cascadeNodeId?: string;
  cascadeParentNodeId?: string | null;
  updatedAt: number;
}


const KEY = "kpi_set_entries_v7";
const EVT = "kpi-set-updated";

// Köhnə versiyaları təmizlə — istifadəçi tərəfindən yaradılan hədəfləri silir.
try { ["kpi_set_entries_v1","kpi_set_entries_v2","kpi_set_entries_v3","kpi_set_entries_v4","kpi_set_entries_v5","kpi_set_entries_v6"].forEach(k => localStorage.removeItem(k)); } catch {}

const SEED: KpiSetEntry[] = [
  // ============ ELVİN RƏHİMOV (id=4, manager@kpi.az) — Marketinq Departamenti rəhbəri ============
  // Pending: HR yeni hədəf təyin edir, Elvin təfsilatı doldurmalıdır
  {
    id: "ks-elvin-1",
    cardId: 101,
    cardName: "Q1 2026 — Marketinq Büdcə Hədəfi",
    subKpiId: 1001,
    subKpiName: "",
    target: "",
    unit: "",
    assigneeId: 4,
    assigneeName: "Elvin Rəhimov",
    ownerType: "manager",
    status: "pending",
    weightMin: 15, weightMax: 35,
    updatedAt: Date.now() - 3600000 * 6,
  },
  // Completed WITH cascade — HR-in Elvinə verdiyi 500 000 AZN kaskadlana bilən hədəf.
  // Elvin bunu Kamran Quliyevə (Manager 2) və digər tabeçilikdə olanlara bölüşdürür.
  {
    id: "ks-elvin-2",
    cardId: 102,
    cardName: "İllik Marketinq Hədəfi 2026",
    subKpiId: 1002,
    subKpiName: "Ümumi marketinq gəliri",
    type: "Məbləğ",
    target: "500000",
    unit: "AZN",
    assigneeId: 4,
    assigneeName: "Elvin Rəhimov",
    ownerType: "manager",
    status: "completed",
    cascadable: node.canReCascade !== false,
    weight: 25,
    limits: {
      l5: { min: 400001, max: 500000 },
      l4: { min: 300001, max: 400000 },
      l3: { min: 200001, max: 300000 },
      l2: { min: 100001, max: 200000 },
      l1: { min: 0, max: 100000 },
    },
    updatedAt: Date.now() - 86400000 * 3,
  },
  // Completed WITHOUT cascade — sadəcə qiymətləndirmə
  {
    id: "ks-elvin-3",
    cardId: 103,
    cardName: "Brend Tanınırlıq Auditi",
    subKpiId: 1003,
    subKpiName: "Sosial media əhatəsi",
    type: "Faiz",
    target: "80",
    unit: "%",
    assigneeId: 4,
    assigneeName: "Elvin Rəhimov",
    ownerType: "manager",
    status: "completed",
    cascadable: false,
    weight: 15,
    limits: {
      l5: { min: 76, max: 80 },
      l4: { min: 61, max: 75 },
      l3: { min: 46, max: 60 },
      l2: { min: 31, max: 45 },
      l1: { min: 0, max: 30 },
    },
    updatedAt: Date.now() - 86400000 * 5,
  },
  // Pending 2 — yeni hədəf gözləyir
  {
    id: "ks-elvin-4",
    cardId: 104,
    cardName: "Rəqəmsal Kampaniyalar",
    subKpiId: 1004,
    subKpiName: "",
    target: "",
    unit: "",
    assigneeId: 4,
    assigneeName: "Elvin Rəhimov",
    ownerType: "manager",
    status: "pending",
    weightMin: 10, weightMax: 25,
    updatedAt: Date.now() - 3600000 * 2,
  },

  // ============ KAMRAN QULİYEV (id=7, manager2@kpi.az) — Rəqəmsal Marketinq Şöbə Müdiri ============
  // HR tərəfindən Orxan Bayramov üçün yaradılan KPI — Target Setter = Kamran Quliyev.
  // Kamran Elvindən gələn kaskad məbləğini istifadə edib Orxana bölüşdürür.
  {
    id: "ks-kamran-1",
    cardId: 201,
    cardName: "Rəqəmsal Marketinq — Şöbə Kaskad Hədəfi",
    subKpiId: 2001,
    subKpiName: "Rəqəmsal marketinq gəliri (Orxan Bayramov üzrə)",
    type: "Məbləğ",
    target: "300000",
    unit: "AZN",
    assigneeId: 7,
    assigneeName: "Kamran Quliyev",
    ownerType: "manager",
    status: "completed",
    cascadable: true,
    weight: 30,
    limits: {
      l5: { min: 240001, max: 300000 },
      l4: { min: 180001, max: 240000 },
      l3: { min: 120001, max: 180000 },
      l2: { min: 60001, max: 120000 },
      l1: { min: 0, max: 60000 },
    },
    updatedAt: Date.now() - 86400000 * 1,
  },

  // ============ Digər rəhbərlər (nümunə) ============
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
    weightMin: 10, weightMax: 30,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: "ks-4",
    cardId: 1,
    cardName: "Aylıq Satış Hədəfi",
    subKpiId: 103,
    subKpiName: "Online Satış",
    type: "Məbləğ",
    target: "50000",
    unit: "AZN",
    assigneeId: 13,
    assigneeName: "Rəşad Əliyev",
    ownerType: "manager",
    status: "completed",
    cascadable: true,
    weight: 20,
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
    type: "Say",
    target: "150",
    unit: "ədəd",
    assigneeId: 22,
    assigneeName: "Emin Məmmədov",
    ownerType: "hr",
    status: "completed",
    cascadable: false,
    weight: 12,
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

/** Yeni pending entry əlavə et — HR kart yaradarkən rəhbərin "Məsul olduğum kartlar"-ında görünsün deyə. */
export const addPendingEntry = (input: {
  cardId: number;
  cardName: string;
  assigneeName: string;
  assigneeId?: number;
  ownerType?: "manager" | "hr";
  subKpiName?: string;
  target?: string;
  type?: KpiEntryType;
  cascadable?: boolean;
  weight?: number;
  status?: "pending" | "completed";
  sourceTargetId?: string;
  weightMin?: number;
  weightMax?: number;
  unit?: string;
}): KpiSetEntry => {
  const list = load();
  const dupe = list.find(e => e.cardId === input.cardId && e.assigneeName === input.assigneeName && (
    input.sourceTargetId ? e.sourceTargetId === input.sourceTargetId : e.status === "pending" && !e.sourceTargetId
  ));
  if (dupe) {
    const next = {
      ...dupe,
      cardName: input.cardName || dupe.cardName,
      subKpiName: input.subKpiName ?? dupe.subKpiName,
      target: input.target ?? dupe.target,
      unit: input.unit ?? dupe.unit,
      type: input.type ?? dupe.type,
      cascadable: input.cascadable ?? dupe.cascadable,
      weight: input.weight ?? dupe.weight,
      status: input.status ?? dupe.status,
      updatedAt: Date.now(),
    };
    persist(list.map(e => e.id === dupe.id ? next : e));
    return next;
  }
  const entry: KpiSetEntry = {
    id: `ks-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    cardId: input.cardId,
    cardName: input.cardName,
    subKpiId: Date.now(),
    subKpiName: input.subKpiName || "",
    target: input.target || "",
    unit: input.unit || "",
    type: input.type,
    assigneeId: input.assigneeId,
    assigneeName: input.assigneeName,
    ownerType: input.ownerType || "manager",
    status: input.status || "pending",
    cascadable: input.cascadable,
    weight: input.weight,
    sourceTargetId: input.sourceTargetId,
    weightMin: input.weightMin,
    weightMax: input.weightMax,
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

const hashToNumber = (s: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return Math.max(1, h % 1_000_000_000);
};

const typeFromUnit = (unit: string): KpiEntryType => {
  if (["AZN", "USD", "EUR", "₼"].includes(unit)) return "Məbləğ";
  if (unit === "%") return "Faiz";
  if (unit === "ədəd") return "Say";
  return "Məbləğ";
};

/** Cascade tree-də yaranan rəhbər node-u "Məsul olduğum kartlar"a dinamik entry kimi sinxronlaşdır. */
export const upsertCascadeEntry = (node: {
  id: string;
  rootId: string;
  parentId: string | null;
  cardName: string;
  goalName: string;
  unit: string;
  assigneeId: number;
  assigneeName: string;
  limit: number;
  canReCascade?: boolean;
}): KpiSetEntry => {
  const list = load();
  const existing = list.find(e => e.cascadeNodeId === node.id || e.id === `ks-cascade-${node.id}`);
  const entry: KpiSetEntry = {
    ...(existing || {} as KpiSetEntry),
    id: existing?.id || `ks-cascade-${node.id}`,
    cardId: hashToNumber(node.rootId),
    cardName: node.cardName,
    subKpiId: hashToNumber(node.id),
    subKpiName: node.goalName,
    type: typeFromUnit(node.unit),
    target: String(node.limit || 0),
    unit: node.unit,
    assigneeId: node.assigneeId,
    assigneeName: node.assigneeName,
    ownerType: "manager",
    status: "completed",
    cascadable: true,
    cascadeNodeId: node.id,
    cascadeParentNodeId: node.parentId,
    updatedAt: Date.now(),
  };
  persist(existing ? list.map(e => e.id === existing.id ? entry : e) : [entry, ...list]);
  return entry;
};

export const removeCascadeEntriesByNodeIds = (nodeIds: string[]) => {
  if (!nodeIds.length) return;
  const drop = new Set(nodeIds);
  persist(load().filter(e => !e.cascadeNodeId || !drop.has(e.cascadeNodeId)));
};

export const setEntryCascadeNodeId = (entryId: string | undefined, nodeId: string) => {
  if (!entryId) return;
  persist(load().map(e => e.id === entryId ? { ...e, cascadeNodeId: nodeId, updatedAt: Date.now() } : e));
};

/** Rəhbərin başqa kartlardan alınmış Cascade Load-u — bu kart istisna edilir. */
export const getIncomingCascadeLoad = (
  assigneeName: string,
  excludeCardId?: number
): { value: number; unit: string; cardName: string } | null => {
  const list = load().filter(e =>
    e.assigneeName === assigneeName &&
    e.cascadable &&
    e.status === "completed" &&
    (excludeCardId == null || e.cardId !== excludeCardId)
  );
  if (!list.length) return null;
  const first = list[0];
  const num = parseFloat(String(first.target).replace(/[^\d.\-]/g, "")) || 0;
  return { value: num, unit: first.unit, cardName: first.cardName };
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

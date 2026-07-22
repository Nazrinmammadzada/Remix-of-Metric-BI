// KPI Set modulu — KPI kartında rəhbərə təyin olunmuş (delegated) və ya HR-in özünün təyin etdiyi
// hədəf-lar üçün QİYMƏT LİMİTLƏRİNİN müəyyən edilməsi.
// Hər sətir bir hədəf-ya uyğundur və 5 səviyyəli aralıq saxlayır (l1..l5).
// Limitlər təyin olunduqda status "completed" olur, əks halda "pending".

import { useEffect, useState } from "react";
import { getNodes as getCascadeNodes } from "@/lib/cascadeTreeStore";
import { getSharedKpiCards } from "@/lib/kpiCardStore";
import { getEmployees } from "@/lib/orgStore";

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
  updatedAt: number;
}


const KEY = "kpi_set_entries_v6";
const EVT = "kpi-set-updated";

// Köhnə versiyaları təmizlə — istifadəçi tərəfindən yaradılan hədəfləri silir.
try { ["kpi_set_entries_v1","kpi_set_entries_v2","kpi_set_entries_v3","kpi_set_entries_v4","kpi_set_entries_v5"].forEach(k => localStorage.removeItem(k)); } catch {}

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
  // Completed WITH cascade load — Elvinə başqa kartdan gələn 120000 AZN cascade limit
  {
    id: "ks-elvin-2",
    cardId: 102,
    cardName: "İllik Marketinq Gəliri",
    subKpiId: 1002,
    subKpiName: "Yeni müştəri gəliri",
    type: "Məbləğ",
    target: "120000",
    unit: "AZN",
    assigneeId: 4,
    assigneeName: "Elvin Rəhimov",
    ownerType: "manager",
    status: "completed",
    cascadable: true,
    weight: 25,
    limits: {
      l5: { min: 96001, max: 120000 },
      l4: { min: 72001, max: 96000 },
      l3: { min: 48001, max: 72000 },
      l2: { min: 24001, max: 48000 },
      l1: { min: 0, max: 24000 },
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

const norm = (value?: string | number | null) => String(value ?? "").split(" — ")[0].trim().toLowerCase().replace(/\s+/g, " ");

const entryKey = (entry: Pick<KpiSetEntry, "cardId" | "subKpiId" | "subKpiName" | "assigneeId" | "assigneeName">) => {
  const assignee = entry.assigneeId != null ? String(entry.assigneeId) : norm(entry.assigneeName);
  const target = norm(entry.subKpiName) || String(entry.subKpiId ?? "");
  return `${entry.cardId}::${assignee}::${target}`;
};

const betterEntry = (a: KpiSetEntry, b: KpiSetEntry) => {
  if (a.status !== b.status) return a.status === "completed" ? a : b;
  return (Number(a.updatedAt) || 0) >= (Number(b.updatedAt) || 0) ? a : b;
};

export const dedupeKpiSetEntries = (rows: KpiSetEntry[]): KpiSetEntry[] => {
  const map = new Map<string, KpiSetEntry>();
  rows.forEach(row => {
    const key = entryKey(row);
    const existing = map.get(key);
    map.set(key, existing ? betterEntry(existing, row) : row);
  });
  return Array.from(map.values()).sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
};

const load = (): KpiSetEntry[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as KpiSetEntry[];
      const compact = dedupeKpiSetEntries(Array.isArray(parsed) ? parsed : []);
      if (compact.length !== parsed.length) localStorage.setItem(KEY, JSON.stringify(compact));
      return compact;
    }
  } catch {}
  localStorage.setItem(KEY, JSON.stringify(SEED));
  return SEED;
};

const persist = (rows: KpiSetEntry[]) => {
  localStorage.setItem(KEY, JSON.stringify(dedupeKpiSetEntries(rows)));
  window.dispatchEvent(new Event(EVT));
};

export const getKpiSetEntries = (): KpiSetEntry[] => load();

/** Yeni pending entry əlavə et — HR kart yaradarkən rəhbərin "Məsul olduğum kartlar"-ında görünsün deyə. */
export const addPendingEntry = (input: {
  id?: string;
  cardId: number;
  cardName: string;
  subKpiId?: number;
  subKpiName?: string;
  type?: KpiEntryType;
  target?: string;
  assigneeName: string;
  assigneeId?: number;
  ownerType?: "manager" | "hr";
  weight?: number;
  weightMin?: number;
  weightMax?: number;
  unit?: string;
  cascadable?: boolean;
}): KpiSetEntry => {
  const list = load();
  const incomingName = String(input.subKpiName || "").trim();
  const incomingKey = entryKey({
    cardId: input.cardId,
    subKpiId: input.subKpiId ?? Date.now(),
    subKpiName: incomingName,
    assigneeId: input.assigneeId,
    assigneeName: input.assigneeName,
  });
  const dupe = list.find(e => (input.id && e.id === input.id) || entryKey(e) === incomingKey);
  if (dupe) return dupe;
  const entry: KpiSetEntry = {
    id: input.id || `ks-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    cardId: input.cardId,
    cardName: input.cardName,
    subKpiId: input.subKpiId ?? Date.now(),
    subKpiName: input.subKpiName || "",
    type: input.type,
    target: input.target || "",
    unit: input.unit || "",
    assigneeId: input.assigneeId,
    assigneeName: input.assigneeName,
    ownerType: input.ownerType || "manager",
    status: "pending",
    weight: input.weight,
    weightMin: input.weightMin,
    weightMax: input.weightMax,
    cascadable: input.cascadable,
    updatedAt: Date.now(),
  };
  persist([entry, ...list]);
  return entry;
};

export const getLimitsFor = (cardId: number, subKpiId: number): LimitSet | undefined =>
  load().find(e => e.cardId === cardId && e.subKpiId === subKpiId)?.limits;

export const setEntryLimits = (id: string, limits: LimitSet) => {
  const rows = load();
  const target = rows.find(e => e.id === id);
  persist(rows.map(e => (e.id === id ? { ...e, limits, status: "completed", updatedAt: Date.now() } : e)));
  if (target) maybeTriggerApproval(target.cardId);
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
  let touchedCardId: number | null = null;
  persist(load().map(e => {
    if (e.id !== id) return e;
    const next = { ...e, ...patch, updatedAt: Date.now() };
    const hasLimits = !!(next.limits || (next.dynamicLimits && next.dynamicLimits.length) || (next.scoreDescriptions && next.scoreDescriptions.length));
    if (hasLimits && next.subKpiName && next.target) next.status = "completed";
    if (next.status === "completed") touchedCardId = next.cardId;
    return next;
  }));
  if (touchedCardId != null) maybeTriggerApproval(touchedCardId);
};

/**
 * Set entry completed olduqda approval workflow-nu tetiklə.
 * Dinamik import — circular dependency-dən qaçmaq üçün.
 */
const maybeTriggerApproval = (cardId: number) => {
  import("./kpiApprovalFlow").then(m => m.triggerCardApprovalIfComplete(cardId)).catch(() => {});
};

/**
 * Rəhbərə yuxarı rəhbərdən (və ya HR-in yaratdığı Owner kartından) gələn Cascade Load.
 * Mənbə ardıcıllığı:
 *   1) `cascadeTreeStore`-da assigneeName == setter, parentId != null olan node varsa,
 *      həmin parent onu bölüşdürmüşdür → node.limit qaytarılır.
 *   2) Yoxdursa: mövcud `SharedKpiCard`-lar arasında ownerId setter-ə uyğun və
 *      cascadable olanın targets cəmi (istifadəçinin özünə HR verdiyi ana KPI).
 *   3) Fallback: köhnə davranış (başqa cascadable KpiSetEntry-nin target-i).
 */
export const getIncomingCascadeLoad = (
  assigneeName: string,
  excludeCardId?: number,
  match?: { cardName?: string; goalName?: string }
): { value: number; unit: string; cardName: string; nodeId?: string } | null => {
  // 1) Cascade ağacında bu şəxsə yuxarıdan gələn node; yoxdursa HR-in yaratdığı root.
  //    Node id-si də qaytarılır ki, kaskadlama dialoqu MÜTLƏQ eyni node üzərində işləsin
  //    (yeni root/başqa node axtarışı olmasın).
  try {
    const newestFirst = (a: any, b: any) => (Number(b.updatedAt || b.createdAt) || 0) - (Number(a.updatedAt || a.createdAt) || 0);
    const personNodes = getCascadeNodes()
      .filter(n => n.assigneeName === assigneeName && (Number(n.limit) || 0) > 0)
      .sort(newestFirst);
    const exactNodes = personNodes.filter(n =>
      (!match?.cardName || n.cardName === match.cardName) &&
      (!match?.goalName || n.goalName === match.goalName)
    );
    const pool = exactNodes.length > 0 ? exactNodes : personNodes;
    const treeNode = pool.find(n => n.parentId !== null) || pool.find(n => n.parentId === null);
    if (treeNode) {
      return { value: Number(treeNode.limit) || 0, unit: treeNode.unit || "", cardName: treeNode.cardName, nodeId: treeNode.id };
    }
  } catch {}

  // 2) SharedKpiCard-lardan: setter həm owner, həm də assignee ola bilər
  //    (HR-in verdiyi cascadable kart). Yeni yaradılmış kart öncə gəlsin.
  try {
    const emp = getEmployees().find(e => `${e.firstName} ${e.lastName}` === assigneeName);
    if (emp) {
      const empKey = `e${emp.id}`;
      const cards = getSharedKpiCards()
        .filter(c =>
          (c.ownerId === empKey || (c.assigneeIds || []).includes(empKey)) &&
          (excludeCardId == null || c.numericId !== excludeCardId)
        )
        .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
      for (const c of cards) {
        const sum = (c.targets || []).reduce((s, t) => {
          if ((t as any).cascading === false) return s;
          const n = parseFloat(String((t as any).targetValue ?? (t as any).target ?? (t as any).value ?? "").replace(/[^\d.\-]/g, "")) || 0;
          return s + n;
        }, 0);
        if (sum > 0) return { value: sum, unit: (c.targets?.[0] as any)?.unit || "", cardName: c.name };
      }
    }
  } catch {}

  // 3) Fallback: köhnə davranış — başqa cascadable KpiSetEntry
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

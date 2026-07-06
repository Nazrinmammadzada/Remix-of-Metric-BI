// Cascade Tree Store — Ana Hədəf → Alt Hədəflər zənciri.
// Hər node bir şəxsə ayrılmış limitdir. Bölgü rekursivdir və heç bir
// Cascading Matrix tələb etmir; təşkilati struktur `orgStore`-dan alınır.
import { useEffect, useState } from "react";
import { getEmployees, isStarPerson } from "@/lib/orgStore";

export interface CascadeTreeNode {
  id: string;
  rootId: string;
  parentId: string | null;
  /** Root üçün: mənbə KPI kartı adı */
  cardName: string;
  /** Root üçün: hədəfin adı */
  goalName: string;
  /** Ölçü vahidi (AZN, ədəd, %) */
  unit: string;
  assigneeId: number;
  assigneeName: string;
  positionName?: string;
  isStar: boolean;
  /** Bu şəxsə ayrılmış limit */
  limit: number;
  createdAt: number;
  updatedAt: number;
  /** Rəhbər bu hədəfi daha aşağı kaskadlamamaq qərarı verib */
  frozen?: boolean;
  /** Bu şəxsə kaskadlanmış hədəfi növbəti səviyyəyə ötürmək icazəsi var */
  canReCascade?: boolean;
}

const KEY = "cascade_tree_nodes_v7";
const LEGACY_KEYS = ["cascade_tree_nodes_v6", "cascade_tree_nodes_v5", "cascade_tree_nodes_v4", "cascade_tree_nodes_v3", "cascade_tree_nodes_v2", "cascade_tree_nodes_v1"];
const EVT = "cascade-tree-updated";

const DEMO_AT = Date.now() - 1000 * 60 * 60 * 24 * 7;
const DEMO_SEED: CascadeTreeNode[] = [
  {
    id: "demo-cascade-marketing-root",
    rootId: "demo-cascade-marketing-root",
    parentId: null,
    cardName: "Marketinq Kampaniyalarının ROI-si",
    goalName: "ROI gəliri",
    unit: "AZN",
    assigneeId: 4,
    assigneeName: "Elvin Rəhimov",
    positionName: "Marketinq Direktoru",
    isStar: true,
    limit: 750000,
    createdAt: DEMO_AT,
    updatedAt: DEMO_AT,
    canReCascade: true,
  },
  {
    id: "demo-cascade-marketing-kamran",
    rootId: "demo-cascade-marketing-root",
    parentId: "demo-cascade-marketing-root",
    cardName: "Marketinq Kampaniyalarının ROI-si",
    goalName: "ROI gəliri",
    unit: "AZN",
    assigneeId: 7,
    assigneeName: "Kamran Quliyev",
    positionName: "Rəqəmsal Marketinq Şöbə Müdiri",
    isStar: true,
    limit: 350000,
    createdAt: DEMO_AT + 1,
    updatedAt: DEMO_AT + 1,
    canReCascade: true,
  },
  {
    id: "demo-cascade-marketing-orxan",
    rootId: "demo-cascade-marketing-root",
    parentId: "demo-cascade-marketing-kamran",
    cardName: "Marketinq Kampaniyalarının ROI-si",
    goalName: "ROI gəliri",
    unit: "AZN",
    assigneeId: 15,
    assigneeName: "Orxan Bayramov",
    positionName: "Marketinq Mütəxəssisi",
    isStar: false,
    limit: 150000,
    createdAt: DEMO_AT + 2,
    updatedAt: DEMO_AT + 2,
  },
];

const mergeDemoRows = (rows: CascadeTreeNode[]): CascadeTreeNode[] => {
  const ids = new Set(rows.map(r => r.id));
  const missing = DEMO_SEED.filter(r => !ids.has(r.id));
  return missing.length ? [...missing, ...rows] : rows;
};

const load = (): CascadeTreeNode[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const rows = mergeDemoRows(JSON.parse(raw));
      localStorage.setItem(KEY, JSON.stringify(rows));
      return rows;
    }
    for (const legacyKey of LEGACY_KEYS) {
      const legacy = localStorage.getItem(legacyKey);
      if (!legacy) continue;
      const rows = mergeDemoRows(JSON.parse(legacy));
      localStorage.setItem(KEY, JSON.stringify(rows));
      return rows;
    }
  } catch {}
  localStorage.setItem(KEY, JSON.stringify(DEMO_SEED));
  return DEMO_SEED;
};

const persist = (rows: CascadeTreeNode[]) => {
  localStorage.setItem(KEY, JSON.stringify(rows));
  window.dispatchEvent(new Event(EVT));
};

/** Verilən şəxs üçün "gələn kaskad yükü" — yəni yuxarı rəhbərdən ona kaskadlanan
 *  hər hansı bir node. Bu node child və ya root ola bilər. Bu node-un limiti
 *  o şəxsin öz tabeliyində bölüşdürə biləcəyi maksimum həddir.
 *  `excludeCardName` — cari kartı istisna etmək üçün (özünü kaskadlamamaq üçün). */
export const findIncomingNodeForAssignee = (
  assigneeId: number,
  cardName?: string,
  goalName?: string,
): CascadeTreeNode | undefined => {
  let list = load().filter(n => n.assigneeId === assigneeId);
  if (cardName) {
    const byCard = list.filter(n => n.cardName === cardName);
    if (byCard.length) list = byCard;
  }
  if (goalName) {
    const byGoal = list.filter(n => n.goalName === goalName);
    if (byGoal.length) list = byGoal;
  }
  if (list.length === 0) return undefined;
  // Ən yeni olanı seçirik.
  return list.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))[0];
};

export const incomingLoadFor = (assigneeId: number, cardName?: string, goalName?: string): { total: number; remaining: number; node?: CascadeTreeNode } => {
  const node = findIncomingNodeForAssignee(assigneeId, cardName, goalName);
  if (!node) return { total: 0, remaining: 0 };
  const total = Number(node.limit) || 0;
  const distributed = getChildren(node.id).reduce((s, c) => s + (Number(c.limit) || 0), 0);
  return { total, remaining: Math.max(0, total - distributed), node };
};

export const getNodes = (): CascadeTreeNode[] => load();
export const getRoots = (): CascadeTreeNode[] => load().filter(n => n.parentId === null);
export const getChildren = (id: string): CascadeTreeNode[] => load().filter(n => n.parentId === id);
export const getNode = (id: string): CascadeTreeNode | undefined => load().find(n => n.id === id);

/** Bir node-un birbaşa alt bölgülərinin cəmi. */
export const distributedOf = (id: string): number =>
  getChildren(id).reduce((s, c) => s + (Number(c.limit) || 0), 0);

/** Bir node-a ayrılmış qalıq limit. */
export const remainingOf = (id: string): number => {
  const n = getNode(id);
  if (!n) return 0;
  return Math.max(0, (Number(n.limit) || 0) - distributedOf(id));
};

export type CascadeStatus = "wait" | "in_progress" | "problem" | "done";

/** 🟢 done / 🟡 in_progress / 🔴 problem / ⚪ wait */
export const statusOf = (id: string): CascadeStatus => {
  const n = getNode(id);
  if (!n) return "wait";
  const kids = getChildren(id);
  const dist = distributedOf(id);
  if (kids.length === 0) {
    // son icraçı və ya hələ bölünməyib
    if (n.frozen) return "done";
    if (n.limit === 0) return "wait";
    // Star deyilsə son icraçı sayılır
    return isStarPerson(n.assigneeId) ? "wait" : "done";
  }
  if (dist === 0) return "wait";
  if (dist >= n.limit) return "done";
  if (dist < n.limit && n.frozen) return "problem";
  return "in_progress";
};

/** Root yarat (HR kartı təyin etmə fazasına keçirəndə çağırılır). */
export const createRoot = (payload: {
  cardName: string;
  goalName: string;
  unit: string;
  assigneeId: number;
  assigneeName: string;
  positionName?: string;
  limit: number;
}): CascadeTreeNode => {
  const id = crypto.randomUUID();
  const node: CascadeTreeNode = {
    id, rootId: id, parentId: null,
    cardName: payload.cardName,
    goalName: payload.goalName,
    unit: payload.unit,
    assigneeId: payload.assigneeId,
    assigneeName: payload.assigneeName,
    positionName: payload.positionName,
    isStar: isStarPerson(payload.assigneeId),
    limit: Number(payload.limit) || 0,
    createdAt: Date.now(), updatedAt: Date.now(),
  };
  persist([...load(), node]);
  return node;
};

export interface CascadeSliceInput {
  assigneeId: number;
  assigneeName: string;
  positionName?: string;
  limit: number;
  canReCascade?: boolean;
}

/** Bir node-u alt şəxslər arasında bölüşdürür.
 *  Alt bölgülərin cəmi ana hədəf limitindən böyük ola bilməz. */
export const distribute = (parentId: string, slices: CascadeSliceInput[]): { ok: boolean; error?: string } => {
  const parent = getNode(parentId);
  if (!parent) return { ok: false, error: "Ana hədəf tapılmadı" };
  const filtered = slices.filter(s => s.assigneeId && Number(s.limit) > 0);
  const total = filtered.reduce((s, sl) => s + Number(sl.limit), 0);
  const parentLimit = Number(parent.limit) || 0;
  if (total > parentLimit) {
    return {
      ok: false,
      error: `Bölüşdürülən cəm (${new Intl.NumberFormat("az-AZ").format(total)}) ana hədəfdən (${new Intl.NumberFormat("az-AZ").format(parentLimit)}) böyük ola bilməz.`,
    };
  }
  const now = Date.now();
  const list = load()
    .filter(n => n.parentId !== parentId) // köhnə bölgüləri sil
    .map(n => n.id === parentId ? { ...n, updatedAt: now } : n);
  const newKids: CascadeTreeNode[] = filtered.map(s => ({
    id: crypto.randomUUID(),
    rootId: parent.rootId,
    parentId: parent.id,
    cardName: parent.cardName,
    goalName: parent.goalName,
    unit: parent.unit,
    assigneeId: s.assigneeId,
    assigneeName: s.assigneeName,
    positionName: s.positionName,
    isStar: isStarPerson(s.assigneeId),
    limit: Number(s.limit),
    canReCascade: !!s.canReCascade,
    createdAt: now, updatedAt: now,
  }));
  persist([...list, ...newKids]);
  return { ok: true };
};

/** Rəhbər hədəfi aşağı bölüşdürməmək qərarı verir — son icraçı kimi qeyd et. */
export const freezeNode = (id: string, frozen: boolean) => {
  persist(load().map(n => n.id === id ? { ...n, frozen, updatedAt: Date.now() } : n));
};

/** Root-un mövcud olub-olmadığını yoxlayır (KpiSet entry üçün id əsasında). */
export const findRootByGoal = (cardName: string, goalName: string, assigneeId: number): CascadeTreeNode | undefined =>
  load().find(n => n.parentId === null && n.cardName === cardName && n.goalName === goalName && n.assigneeId === assigneeId);

export const deleteSubtree = (id: string) => {
  const all = load();
  const drop = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of all) if (n.parentId && drop.has(n.parentId) && !drop.has(n.id)) { drop.add(n.id); changed = true; }
  }
  persist(all.filter(n => !drop.has(n.id)));
};

export const useCascadeTree = (): CascadeTreeNode[] => {
  const [rows, setRows] = useState<CascadeTreeNode[]>(() => load());
  useEffect(() => {
    const h = () => setRows(load());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener("storage", h); };
  }, []);
  return rows;
};

const fmt = (n: number) => new Intl.NumberFormat("az-AZ").format(n);


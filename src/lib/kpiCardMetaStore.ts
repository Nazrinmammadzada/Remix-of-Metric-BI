// Lightweight bridge: HR wizard yaradan lokal KPI kartlarını (numeric id)
// approval axını üçün lazımi meta ilə saxlayır (matrixId, ownerId, assignee-lər).
// Bu, SharedKpiCard yaradılmadan da avtomatik Approval Workflow-nun işləməsinə imkan verir.

export interface KpiCardMeta {
  cardId: number;        // KpiCard.id (numeric)
  stringId: string;      // approval item üçün stable string id
  name: string;
  matrixId: string | null;
  ownerId: string;       // enriched employee id (e.g. "e1")
  assigneeIds: string[]; // enriched employee ids
  createdAt: number;
}

const KEY = "kpi_card_meta_v1";

const load = (): KpiCardMeta[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const save = (list: KpiCardMeta[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
};

export const getKpiCardMeta = (cardId: number): KpiCardMeta | null =>
  load().find(m => m.cardId === cardId) || null;

export const upsertKpiCardMeta = (meta: Omit<KpiCardMeta, "createdAt" | "stringId"> & { stringId?: string }) => {
  const list = load();
  const idx = list.findIndex(m => m.cardId === meta.cardId);
  const stringId = meta.stringId || (idx >= 0 ? list[idx].stringId : `kpi-${meta.cardId}`);
  const next: KpiCardMeta = {
    cardId: meta.cardId,
    stringId,
    name: meta.name,
    matrixId: meta.matrixId,
    ownerId: meta.ownerId,
    assigneeIds: meta.assigneeIds,
    createdAt: idx >= 0 ? list[idx].createdAt : Date.now(),
  };
  if (idx >= 0) list[idx] = next; else list.unshift(next);
  save(list);
  return next;
};

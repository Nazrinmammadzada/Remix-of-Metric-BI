// Central cross-panel KPI card registry. Mirrors KPI cards created via the wizard
// so that Manager / User panels can see (scoped) the same items HR sees.
// Persisted in localStorage + custom event for cross-tab/panel sync.

import { useEffect, useState } from "react";
import type { CreateKpiWizardDraft } from "@/components/kpi/CreateKpiWizard";

export type SharedKpiStatus = "natamam" | "tesdiq_gozlenilir" | "imtina" | "aktiv";
export type ExecutionStatus = "baslanmayib" | "icrada" | "tamamlandi" | "gecikme";

export interface SharedKpiCard {
  id: string;
  numericId?: number; // optional bridge to legacy KpiCardsPage rows
  name: string;
  ownerId: string;             // KPI sahibi (yaradan və ya "createdByEmployee")
  evaluatorIds: string[];      // qiymətləndiricilər (employee ids)
  assigneeIds: string[];       // hədəfin icra olunacağı şəxslər
  structureIds: string[];
  teamIds: string[];
  matrixId: string | null;     // seçilmiş təsdiqləmə matrisi
  status: SharedKpiStatus;
  rejectedReason?: string;
  startDate: string;
  endDate: string;
  frequency: string;
  scoringSystem: string;
  targets: { id: string; name: string; type: string; weight: number; scoreLimit: number }[];
  execution: Record<string, ExecutionStatus>; // assigneeId → status
  history: { ts: string; actor: string; action: string; note?: string }[];
  createdAt: string;
  updatedAt: string;
}

const KEY = "shared_kpi_cards_v1";
const EVT = "shared-kpi-cards-updated";

const load = (): SharedKpiCard[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const rows = JSON.parse(raw) as SharedKpiCard[];
      const seed = seedCards();
      const byId = new Map(rows.map(c => [c.id, c] as const));
      seed.forEach(seedCard => {
        const existing = byId.get(seedCard.id);
        byId.set(seedCard.id, existing ? {
          ...existing,
          evaluatorIds: Array.from(new Set([...(existing.evaluatorIds || []), ...seedCard.evaluatorIds])),
          assigneeIds: Array.from(new Set([...(existing.assigneeIds || []), ...seedCard.assigneeIds])),
          structureIds: Array.from(new Set([...(existing.structureIds || []), ...seedCard.structureIds])),
          teamIds: Array.from(new Set([...(existing.teamIds || []), ...seedCard.teamIds])),
        } : seedCard);
      });
      const merged = Array.from(byId.values());
      localStorage.setItem(KEY, JSON.stringify(merged));
      return merged;
    }
  } catch {}
  const seed = seedCards();
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
};

const save = (list: SharedKpiCard[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
};

export const getSharedKpiCards = (): SharedKpiCard[] => load();

export const upsertSharedKpiCard = (card: SharedKpiCard) => {
  const list = load();
  const idx = list.findIndex(c => c.id === card.id);
  if (idx >= 0) list[idx] = { ...card, updatedAt: new Date().toISOString() };
  else list.unshift({ ...card, createdAt: card.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
  save(list);
};

export const setKpiStatus = (id: string, status: SharedKpiStatus, actor: string, note?: string) => {
  const list = load();
  const idx = list.findIndex(c => c.id === id);
  if (idx < 0) return;
  list[idx] = {
    ...list[idx],
    status,
    rejectedReason: status === "imtina" ? note : undefined,
    history: [...list[idx].history, { ts: new Date().toISOString(), actor, action: `status:${status}`, note }],
    updatedAt: new Date().toISOString(),
  };
  save(list);
};

export const updateExecution = (id: string, assigneeId: string, status: ExecutionStatus, actor: string) => {
  const list = load();
  const idx = list.findIndex(c => c.id === id);
  if (idx < 0) return;
  list[idx] = {
    ...list[idx],
    execution: { ...list[idx].execution, [assigneeId]: status },
    history: [...list[idx].history, { ts: new Date().toISOString(), actor, action: `execution:${assigneeId}=${status}` }],
    updatedAt: new Date().toISOString(),
  };
  save(list);
};

export const deleteSharedKpiCard = (id: string) => save(load().filter(c => c.id !== id));

/** Convert a wizard draft into a shared KPI card snapshot. */
export const buildSharedCardFromDraft = (
  d: CreateKpiWizardDraft,
  meta: {
    id?: string;
    numericId?: number;
    ownerId: string;
    status: SharedKpiStatus;
    matrixId: string | null;
    assigneeIds?: string[];
    teamIds?: string[];
    structureIds?: string[];
  },
): SharedKpiCard => ({
  id: meta.id || crypto.randomUUID(),
  numericId: meta.numericId,
  name: d.name || "Adsız KPI",
  ownerId: meta.ownerId,
  evaluatorIds: Array.from(new Set(d.targets.map(t => t.evaluator).filter(Boolean))),
  assigneeIds: meta.assigneeIds && meta.assigneeIds.length > 0
    ? meta.assigneeIds
    : Array.from(new Set(d.targets.map(t => t.assigner).filter(Boolean))),
  structureIds: meta.structureIds || [],
  teamIds: meta.teamIds || [],
  matrixId: meta.matrixId,
  status: meta.status,
  startDate: d.startDate || "",
  endDate: d.endDate || "",
  frequency: d.frequency,
  scoringSystem: d.scoringSystem,
  targets: d.targets.map(t => ({ id: t.id, name: t.name, type: t.type, weight: t.weight, scoreLimit: t.scoreLimit })),
  execution: {},
  history: [{ ts: new Date().toISOString(), actor: meta.ownerId, action: `created:${meta.status}` }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ---------- React hook ----------
export const useSharedKpiCards = (): SharedKpiCard[] => {
  const [rows, setRows] = useState<SharedKpiCard[]>(() => load());
  useEffect(() => {
    const h = () => setRows(load());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener("storage", h); };
  }, []);
  return rows;
};

// ---------- Seed (a handful of cross-panel demo cards) ----------
function seedCards(): SharedKpiCard[] {
  const now = new Date().toISOString();
  return [
    {
      id: "seed-1",
      numericId: 1001,
      name: "Aylıq Satış Hədəfi — Elite Komanda",
      ownerId: "e8",
      evaluatorIds: ["e8"],
      assigneeIds: ["e4", "e11"],
      structureIds: ["s_sales"],
      teamIds: ["t_sales_elite"],
      matrixId: null,
      status: "aktiv",
      startDate: "2026-01-01", endDate: "2026-12-31", frequency: "Aylıq", scoringSystem: "1-5",
      targets: [{ id: "tg-1", name: "Aylıq satış həcmi", type: "Məbləğ", weight: 100, scoreLimit: 5 }],
      execution: { e4: "icrada", e11: "baslanmayib" },
      history: [{ ts: now, actor: "e1", action: "created:aktiv" }],
      createdAt: now, updatedAt: now,
    },
    {
      id: "seed-2",
      numericId: 1002,
      name: "Müştəri Məmnuniyyəti",
      ownerId: "e8",
      evaluatorIds: ["e8"],
      assigneeIds: ["e4"],
      structureIds: ["s_sales"],
      teamIds: ["t_sales_elite"],
      matrixId: null,
      status: "tesdiq_gozlenilir",
      startDate: "2026-01-01", endDate: "2026-06-30", frequency: "Rüblük", scoringSystem: "1-10",
      targets: [{ id: "tg-2", name: "NPS skoru", type: "Faiz", weight: 100, scoreLimit: 10 }],
      execution: {},
      history: [{ ts: now, actor: "e1", action: "created:tesdiq_gozlenilir" }],
      createdAt: now, updatedAt: now,
    },
    {
      id: "seed-3",
      numericId: 1003,
      name: "Backend Stabilitet",
      ownerId: "e2",
      evaluatorIds: ["e2"],
      assigneeIds: ["e6", "e9", "e10"],
      structureIds: ["s_it"],
      teamIds: ["t_it_core"],
      matrixId: null,
      status: "aktiv",
      startDate: "2026-01-01", endDate: "2026-12-31", frequency: "Aylıq", scoringSystem: "1-5",
      targets: [{ id: "tg-3", name: "Uptime %", type: "Faiz", weight: 100, scoreLimit: 5 }],
      execution: { e6: "icrada", e9: "tamamlandi", e10: "icrada" },
      history: [{ ts: now, actor: "e2", action: "created:aktiv" }],
      createdAt: now, updatedAt: now,
    },
    {
      id: "seed-4",
      numericId: 1004,
      name: "Müştəri Şikayətlərinin Azaldılması",
      ownerId: "e2",
      evaluatorIds: ["e2", "e8"],
      assigneeIds: ["e6", "e9"],
      structureIds: ["s_it"],
      teamIds: ["t_it_core"],
      matrixId: "matrix-standard",
      status: "imtina",
      rejectedReason: "Hədəf dəyəri çox aşağıdır — yenidən nəzərdən keçirilməlidir.",
      startDate: "2026-01-01", endDate: "2026-06-30", frequency: "Rüblük", scoringSystem: "1-5",
      targets: [
        { id: "tg-4a", name: "Şikayət sayının azaldılması", type: "Say", weight: 60, scoreLimit: 5 },
        { id: "tg-4b", name: "Cavab müddəti", type: "Zaman", weight: 40, scoreLimit: 5 },
      ],
      execution: {},
      history: [
        { ts: now, actor: "e1", action: "created:tesdiq_gozlenilir" },
        { ts: now, actor: "Departament Direktoru", action: "status:imtina", note: "Hədəf dəyəri çox aşağıdır — yenidən nəzərdən keçirilməlidir." },
      ],
      createdAt: now, updatedAt: now,
    },
    {
      id: "seed-5",
      numericId: 1005,
      name: "Marketinq Kampaniyalarının ROI-si",
      ownerId: "e8",
      evaluatorIds: ["e8", "e12"],
      assigneeIds: ["e4", "e11", "e12"],
      structureIds: ["s_marketing"],
      teamIds: ["t_marketing"],
      matrixId: "matrix-standard",
      status: "imtina",
      rejectedReason: "Qiymətləndirici seçimi tələblərə uyğun deyil.",
      startDate: "2026-01-01", endDate: "2026-12-31", frequency: "Aylıq", scoringSystem: "1-10",
      targets: [
        { id: "tg-5a", name: "ROI faizi", type: "Faiz", weight: 100, scoreLimit: 10 },
      ],
      execution: {},
      history: [
        { ts: now, actor: "e1", action: "created:tesdiq_gozlenilir" },
        { ts: now, actor: "HR Direktoru", action: "status:imtina", note: "Qiymətləndirici seçimi tələblərə uyğun deyil." },
      ],
      createdAt: now, updatedAt: now,
    },
    {
      id: "seed-manager2-1",
      numericId: 1006,
      name: "Rəqəmsal Marketinq — Lead Konversiyası",
      ownerId: "e12",
      evaluatorIds: ["e12", "e8"],
      assigneeIds: ["e12", "e13"],
      structureIds: ["s_market"],
      teamIds: ["t_market_team"],
      matrixId: null,
      status: "aktiv",
      startDate: "2026-01-01", endDate: "2026-03-31", frequency: "Rüblük", scoringSystem: "1-5",
      targets: [
        { id: "tg-m2-1", name: "Lead konversiyası", type: "Faiz", weight: 60, scoreLimit: 5 },
        { id: "tg-m2-2", name: "Kampaniya gəliri", type: "Məbləğ", weight: 40, scoreLimit: 5 },
      ],
      execution: { e12: "icrada", e13: "baslanmayib" },
      history: [{ ts: now, actor: "e8", action: "created:aktiv" }],
      createdAt: now, updatedAt: now,
    },
  ];
}


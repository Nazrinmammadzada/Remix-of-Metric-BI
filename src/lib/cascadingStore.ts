// Cascading store — paylaşıla bilən hədəf-ların komandaya bölünməsi.
// Hər entry KpiSetEntry-yə bağlanır (entryId). Distribution = işçilərə pay.
// Limitlər istifadəçi tərəfindən manual təyin olunur (auto-suggest YOXDUR).
import { useEffect, useState } from "react";
import type { LimitSet, LimitTier } from "@/lib/kpiSetStore";

export interface CascadeSlice {
  id: string;
  assigneeName: string;
  target: string;
  limits: LimitSet;
}

export interface CascadeAssignment {
  id: string;
  /** KpiSetEntry.id */
  entryId: string;
  cardName: string;
  subKpiName: string;
  parentTarget: string;
  unit: string;
  /** seçilmiş cascade matrisi */
  matrixId?: string;
  matrixName?: string;
  slices: CascadeSlice[];
  status: "draft" | "submitted";
  updatedAt: number;
}

const KEY = "cascade_assignments_v2";
const EVT = "cascade-assignments-updated";

export const emptyLimits = (): LimitSet => ({
  l1: { min: 0, max: 0 },
  l2: { min: 0, max: 0 },
  l3: { min: 0, max: 0 },
  l4: { min: 0, max: 0 },
  l5: { min: 0, max: 0 },
});

const seed: CascadeAssignment[] = [
  {
    id: "ca-1",
    entryId: "ks-4",
    cardName: "Aylıq Satış Hədəfi",
    subKpiName: "Online Satış",
    parentTarget: "50000",
    unit: "AZN",
    matrixId: "cm-1",
    matrixName: "Elite Satış Komandası Cascade",
    status: "submitted",
    updatedAt: Date.now() - 86400000,
    slices: [
      {
        id: "cs-1",
        assigneeName: "Leyla Məmmədova",
        target: "20000",
        limits: {
          l5: { min: 16001, max: 20000 },
          l4: { min: 12001, max: 16000 },
          l3: { min: 8001, max: 12000 },
          l2: { min: 4001, max: 8000 },
          l1: { min: 0, max: 4000 },
        },
      },
      {
        id: "cs-2",
        assigneeName: "Rəşad Əliyev",
        target: "20000",
        limits: {
          l5: { min: 16001, max: 20000 },
          l4: { min: 12001, max: 16000 },
          l3: { min: 8001, max: 12000 },
          l2: { min: 4001, max: 8000 },
          l1: { min: 0, max: 4000 },
        },
      },
      {
        id: "cs-3",
        assigneeName: "Nigar Hüseynova",
        target: "10000",
        limits: {
          l5: { min: 8001, max: 10000 },
          l4: { min: 6001, max: 8000 },
          l3: { min: 4001, max: 6000 },
          l2: { min: 2001, max: 4000 },
          l1: { min: 0, max: 2000 },
        },
      },
    ],
  },
  {
    id: "ca-2",
    entryId: "ks-5",
    cardName: "Müştəri Əldə Etmə",
    subKpiName: "Referral Müştərilər",
    parentTarget: "150",
    unit: "ədəd",
    matrixId: "cm-3",
    matrixName: "İpoteka Komandası Cascade",
    status: "submitted",
    updatedAt: Date.now() - 3600000 * 6,
    slices: [
      {
        id: "cs-4",
        assigneeName: "Günel Əlizadə",
        target: "80",
        limits: {
          l5: { min: 65, max: 80 },
          l4: { min: 49, max: 64 },
          l3: { min: 33, max: 48 },
          l2: { min: 17, max: 32 },
          l1: { min: 0, max: 16 },
        },
      },
      {
        id: "cs-5",
        assigneeName: "Orxan Məmmədov",
        target: "70",
        limits: {
          l5: { min: 57, max: 70 },
          l4: { min: 43, max: 56 },
          l3: { min: 29, max: 42 },
          l2: { min: 15, max: 28 },
          l1: { min: 0, max: 14 },
        },
      },
    ],
  },
];

const load = (): CascadeAssignment[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
};

const persist = (rows: CascadeAssignment[]) => {
  localStorage.setItem(KEY, JSON.stringify(rows));
  window.dispatchEvent(new Event(EVT));
};

export const getAssignments = (): CascadeAssignment[] => load();

export const getAssignmentByEntry = (entryId: string): CascadeAssignment | undefined =>
  load().find(a => a.entryId === entryId);

export const upsertAssignment = (a: Omit<CascadeAssignment, "id" | "updatedAt"> & { id?: string }) => {
  const list = load();
  const idx = a.id ? list.findIndex(x => x.id === a.id) : list.findIndex(x => x.entryId === a.entryId);
  const value: CascadeAssignment = {
    ...a,
    id: a.id || (idx >= 0 ? list[idx].id : crypto.randomUUID()),
    updatedAt: Date.now(),
  };
  if (idx >= 0) list[idx] = value;
  else list.push(value);
  persist(list);
  return value;
};

export const buildSliceFor = (assigneeName: string): CascadeSlice => ({
  id: crypto.randomUUID(),
  assigneeName,
  target: "",
  limits: emptyLimits(),
});

export const useCascadeAssignments = (): CascadeAssignment[] => {
  const [rows, setRows] = useState<CascadeAssignment[]>(() => load());
  useEffect(() => {
    const h = () => setRows(load());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return rows;
};

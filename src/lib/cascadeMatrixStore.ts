// Cascade Matrix store — hər komanda/struktur/vəzifə/şəxs üçün ayrıca cascade matrisi.
// Matris paylaşılan şəxslərin (slice alacaq əməkdaşların) siyahısını saxlayır.
import { useEffect, useState } from "react";

export type CascadeScopeType = "team" | "structure" | "position" | "user";

export interface CascadeMatrix {
  id: string;
  name: string;
  scopeType: CascadeScopeType;
  scopeName: string; // selected team / structure / position / user name
  /** Hədəfin paylaşılacağı şəxslər (slice alacaq) */
  sharedPersons: string[];
  updatedAt: string;
}

const KEY = "cascade_matrices_v2";
const EVT = "cascade-matrix-updated";

const seed: CascadeMatrix[] = [
  {
    id: "cm-1",
    name: "Elite Satış Komandası Cascade",
    scopeType: "team",
    scopeName: "Elite Satış Komandası",
    sharedPersons: ["Leyla Məmmədova", "Rəşad Əliyev", "Nigar Hüseynova"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cm-2",
    name: "Regional Satış Cascade",
    scopeType: "team",
    scopeName: "Regional Satış Komandası",
    sharedPersons: ["Aysel Quliyeva", "Tural İsmayılov"],
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cm-3",
    name: "İpoteka Komandası Cascade",
    scopeType: "team",
    scopeName: "İpoteka Satış Komandası",
    sharedPersons: ["Günel Əlizadə", "Orxan Məmmədov"],
    updatedAt: new Date().toISOString(),
  },
];

const load = (): CascadeMatrix[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
};

const save = (list: CascadeMatrix[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
};

export const getCascadeMatrices = (): CascadeMatrix[] => load();

export const saveCascadeMatrix = (m: Omit<CascadeMatrix, "id" | "updatedAt"> & { id?: string }) => {
  const list = load();
  if (m.id) {
    const idx = list.findIndex(x => x.id === m.id);
    if (idx >= 0) list[idx] = { ...list[idx], ...m, id: list[idx].id, updatedAt: new Date().toISOString() } as CascadeMatrix;
  } else {
    list.push({ ...m, id: crypto.randomUUID(), updatedAt: new Date().toISOString() });
  }
  save(list);
};

export const deleteCascadeMatrix = (id: string) => save(load().filter(x => x.id !== id));

export const useCascadeMatrices = (): CascadeMatrix[] => {
  const [rows, setRows] = useState<CascadeMatrix[]>(() => load());
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

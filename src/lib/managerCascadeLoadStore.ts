// Global "Cascade Load" bucket for a manager (rəhbər).
// Simulates limit coming from OTHER KPI cards. Total = 500 000 AZN.
// Any allocation done in a CascadeDistributeDialog is tracked per key.
// When one dialog uses part of the load, all other dialogs see reduced "remaining".
import { useEffect, useState } from "react";

export const CASCADE_LOAD_TOTAL = 500_000;
const KEY = "manager_cascade_load_v1";
const EVT = "manager-cascade-load-updated";

type Allocations = Record<string, number>;

const load = (): Allocations => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Allocations;
  } catch {}
  return {};
};

const persist = (a: Allocations) => {
  localStorage.setItem(KEY, JSON.stringify(a));
  window.dispatchEvent(new Event(EVT));
};

export const getAllocations = (): Allocations => load();

export const totalSpent = (): number =>
  Object.values(load()).reduce((s, v) => s + (Number(v) || 0), 0);

export const remainingLoad = (): number =>
  Math.max(0, CASCADE_LOAD_TOTAL - totalSpent());

/** Ayrılmış cascade load (bir açar üçün). */
export const getAllocated = (key: string): number => Number(load()[key] || 0);

/** Bir açar üçün load bölgüsünü qeyd edir. */
export const setAllocated = (key: string, amount: number) => {
  const a = load();
  if (!amount || amount <= 0) delete a[key];
  else a[key] = amount;
  persist(a);
};

/** Bir açarın bölgüsünü sıfırlayır. */
export const clearAllocated = (key: string) => setAllocated(key, 0);

/** Bir dialoqun aça bilməsi üçün: mövcud qalıq + o açara aid artıq ayrılmış. */
export const availableFor = (key: string): number =>
  remainingLoad() + getAllocated(key);

/** React hook: cascade load remaining və spent-ı canlı izləyir. */
export const useCascadeLoad = () => {
  const [state, setState] = useState(() => ({
    total: CASCADE_LOAD_TOTAL,
    spent: totalSpent(),
    remaining: remainingLoad(),
  }));
  useEffect(() => {
    const h = () => setState({ total: CASCADE_LOAD_TOTAL, spent: totalSpent(), remaining: remainingLoad() });
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener(EVT, h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return state;
};

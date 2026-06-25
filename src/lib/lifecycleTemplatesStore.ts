// Lifecycle şablonları — KPI Lifecycle planlarını şablon kimi yadda saxlayıb yenidən tətbiq etmək üçün.
import { useEffect, useState } from "react";
import type { CardLifecycle } from "./kpiLifecycleStore";

export interface LifecycleTemplate {
  id: string;
  name: string;
  description?: string;
  data: Omit<CardLifecycle, "cardId" | "cardName" | "updatedAt">;
  createdAt: string;
}

const KEY = "kpi_lifecycle_templates_v1";
const EVT = "kpi-lifecycle-templates-updated";

const load = (): LifecycleTemplate[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};
const persist = (list: LifecycleTemplate[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
};

export const getLifecycleTemplates = (): LifecycleTemplate[] => load();

export const addLifecycleTemplate = (t: Omit<LifecycleTemplate, "id" | "createdAt">) => {
  const list = load();
  const entry: LifecycleTemplate = { ...t, id: `tpl-${Date.now()}`, createdAt: new Date().toISOString() };
  persist([entry, ...list]);
  return entry;
};

export const deleteLifecycleTemplate = (id: string) => {
  persist(load().filter(t => t.id !== id));
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

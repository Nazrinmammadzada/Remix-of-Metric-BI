// Formula assignments — bir düsturun konkret şəxs/vəzifə/struktur/komandalara
// tətbiq edilməsini saxlayır. Hesablama modulunun əsas siyahısı buradan oxunur.

import { getFormulas, type Formula } from "./formulasStore";

export type FormulaTargetType = "sexs" | "vezife" | "struktur" | "komanda" | "butun_sirket";

export interface FormulaTargetRef {
  type: FormulaTargetType;
  id: string | number;
  name: string;
}

export interface FormulaAssignment {
  id: number;
  formulaId: number;
  formulaName: string;
  variables: string[];
  targetTypes: FormulaTargetType[];
  targets: FormulaTargetRef[];
  employeeIds: number[];
  status: "active" | "passive";
  assignedAt: string; // ISO
  updatedAt: string;  // ISO
}

const KEY = "kpi_formula_assignments_v1";
const SEED_KEY = "kpi_formula_assignments_seeded_v1";

const seedDefaults = (): FormulaAssignment[] => {
  const now = new Date().toISOString();
  return getFormulas().map((f, i) => ({
    id: Date.now() + i,
    formulaId: f.id,
    formulaName: f.name,
    variables: f.variables ?? [],
    targetTypes: [],
    targets: [],
    employeeIds: [],
    status: "active",
    assignedAt: now,
    updatedAt: now,
  }));
};

export const getAssignments = (): FormulaAssignment[] => {
  const saved = localStorage.getItem(KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* fallthrough */ }
  }
  if (!localStorage.getItem(SEED_KEY)) {
    const seed = seedDefaults();
    localStorage.setItem(KEY, JSON.stringify(seed));
    localStorage.setItem(SEED_KEY, "1");
    return seed;
  }
  return [];
};

export const saveAssignments = (list: FormulaAssignment[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("formula-assignments-updated"));
};

export const addAssignment = (a: Omit<FormulaAssignment, "id" | "assignedAt" | "updatedAt">) => {
  const list = getAssignments();
  const now = new Date().toISOString();
  const next: FormulaAssignment = { ...a, id: Date.now(), assignedAt: now, updatedAt: now };
  saveAssignments([next, ...list]);
  return next;
};

export const updateAssignment = (id: number, patch: Partial<FormulaAssignment>) => {
  const list = getAssignments().map(a =>
    a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a
  );
  saveAssignments(list);
};

export const deleteAssignment = (id: number) => {
  saveAssignments(getAssignments().filter(a => a.id !== id));
};

/** Formula silinərsə, aid təyinatları da təmizlə. */
export const syncWithFormulas = (formulas: Formula[]) => {
  const ids = new Set(formulas.map(f => f.id));
  const list = getAssignments().filter(a => ids.has(a.formulaId));
  if (list.length !== getAssignments().length) saveAssignments(list);
};

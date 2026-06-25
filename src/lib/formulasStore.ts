// Shared store for calculation formulas + their variable book.
// Used by the standalone "Hesablama Düsturları" module.

export interface FormulaVariable {
  id: number;
  short: string; // e.g. CS
  name: string; // e.g. Cari Satış
  description: string;
  source: string; // integration system name (e.g. CHR, CRM Sistemi)
}

export interface Formula {
  id: number;
  name: string;
  formula: string;
  description: string;
  kpiName?: string; // backward compat (free-text label)
  kpiTypes?: string[]; // KPI tipləri (məlumat kataloqundan) — multiselect
  variables: string[]; // variable shorts referenced
}

const FORMULAS_KEY = "kpi_formulas_v3";
const VARIABLES_KEY = "kpi_formula_variables_v3";

const initialVariables: FormulaVariable[] = [
  { id: 1, short: "CS", name: "Cari Satış", description: "İndiki dövr ərzində baş tutmuş satışın ümumi həcmi (AZN).", source: "CRM Sistemi" },
  { id: 2, short: "HS", name: "Hədəf Satış", description: "Dövr üçün təyin edilmiş satış hədəfi (AZN).", source: "CRM Sistemi" },
  { id: 3, short: "MM", name: "Məmnun Müştəri", description: "Sorğuda müsbət rəy verən müştərilərin sayı.", source: "CRM Sistemi" },
  { id: 4, short: "BM", name: "Baza Maaş", description: "Əməkdaşın aylıq baza maaşı (AZN).", source: "CHR" },
  { id: 5, short: "ID", name: "İş Davamiyyəti", description: "Dövr ərzində iş günləri sayı.", source: "CHR" },
  { id: 6, short: "AS", name: "Audit Sayı", description: "Dövrlük təhlükəsizlik audit sayı.", source: "SIEM Platform" },
  { id: 7, short: "EM", name: "E-poçt Cavabları", description: "Müştəri e-poçt cavablama sayı.", source: "Microsoft 365" },
  { id: 8, short: "HD", name: "Hədəf Dəyər", description: "BSC üçün KPI-nin müəyyən edilmiş hədəf dəyəri.", source: "KPI Kartı" },
  { id: 9, short: "FD", name: "Faktiki Dəyər", description: "BSC üçün KPI-nin faktiki ölçülmüş dəyəri.", source: "KPI Kartı" },
];

const initialFormulas: Formula[] = [
  { id: 1, name: "Satış Performans Düsturu", formula: "(CS / HS) × 100", description: "Satış hədəfinin faizlə yerinə yetirilmə nisbəti", kpiName: "Aylıq Satış Hədəfi", variables: ["CS", "HS"] },
  { id: 2, name: "Müştəri Məmnuniyyət İndeksi", formula: "(MM / 100) × 100", description: "Müştəri sorğusu əsasında məmnuniyyət faizi", kpiName: "Müştəri Məmnuniyyəti", variables: ["MM"] },
  { id: 3, name: "BSC GSR (Tərs) – Xərc/Müddət tipli KPI", formula: "GSR = ( Hədəf Dəyər / Faktiki Dəyər ) × 100%", description: "Balanced Scorecard üçün, kiçik dəyər daha yaxşı olan KPI tiplərinə tətbiq edilir (məs. Xərc Azaltma, Reaksiya Müddəti, Şikayət Sayı).", kpiName: "Əməliyyat Effektivliyi", kpiTypes: ["Trend Hədəfi"], variables: ["HD", "FD"] },
  { id: 4, name: "BSC GSR (Düz) – Satış/Performans tipli KPI", formula: "GSR = ( Faktiki Dəyər / Hədəf Dəyər ) × 100%", description: "Balanced Scorecard üçün, böyük dəyər daha yaxşı olan KPI tiplərinə tətbiq edilir (məs. Faiz Hədəfi, Say Hədəfi, Absolut Hədəf, Benchmark).", kpiName: "Aylıq Satış Hədəfi", kpiTypes: ["Absolut Hədəf", "Faiz Hədəfi", "Say Hədəfi", "Benchmark"], variables: ["FD", "HD"] },
];

export const getVariables = (): FormulaVariable[] => {
  const saved = localStorage.getItem(VARIABLES_KEY);
  if (saved) { try { return JSON.parse(saved); } catch {} }
  localStorage.setItem(VARIABLES_KEY, JSON.stringify(initialVariables));
  return initialVariables;
};

export const saveVariables = (vars: FormulaVariable[]) => {
  localStorage.setItem(VARIABLES_KEY, JSON.stringify(vars));
  window.dispatchEvent(new Event("formulas-updated"));
};

export const getFormulas = (): Formula[] => {
  const saved = localStorage.getItem(FORMULAS_KEY);
  if (saved) { try { return JSON.parse(saved); } catch {} }
  localStorage.setItem(FORMULAS_KEY, JSON.stringify(initialFormulas));
  return initialFormulas;
};

export const saveFormulas = (f: Formula[]) => {
  localStorage.setItem(FORMULAS_KEY, JSON.stringify(f));
  window.dispatchEvent(new Event("formulas-updated"));
};

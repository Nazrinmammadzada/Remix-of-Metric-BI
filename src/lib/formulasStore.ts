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
  kpiTypes?: string[]; // deprecated — hidden in UI
  variables: string[]; // variable shorts referenced
}

const FORMULAS_KEY = "kpi_formulas_v4";
const VARIABLES_KEY = "kpi_formula_variables_v4";

const initialVariables: FormulaVariable[] = [
  { id: 1, short: "CS", name: "Cari Satış", description: "İndiki dövr ərzində baş tutmuş satışın ümumi həcmi (AZN).", source: "CRM Sistemi" },
  { id: 2, short: "HS", name: "Hədəf Satış", description: "Dövr üçün təyin edilmiş satış hədəfi (AZN).", source: "CRM Sistemi" },
  { id: 3, short: "MM", name: "Məmnun Müştəri", description: "Sorğuda müsbət rəy verən müştərilərin sayı.", source: "CRM Sistemi" },
  { id: 4, short: "BM", name: "Baza Maaş", description: "Əməkdaşın aylıq baza maaşı (AZN).", source: "CHR" },
  { id: 5, short: "ID", name: "İş Davamiyyəti", description: "Dövr ərzində iş günləri sayı.", source: "CHR" },
  { id: 6, short: "AS", name: "Audit Sayı", description: "Dövrlük təhlükəsizlik audit sayı.", source: "SIEM Platform" },
  { id: 7, short: "EM", name: "E-poçt Cavabları", description: "Müştəri e-poçt cavablama sayı.", source: "Microsoft 365" },
  { id: 8, short: "Maaş", name: "Aylıq Maaş", description: "Əməkdaşın illik baza maaşı (AZN).", source: "CHR" },
  { id: 9, short: "Çəki", name: "Hədəf Çəkisi", description: "KPI hədəfinin ümumi kart daxilində çəki faizi.", source: "KPI Kartı" },
  { id: 10, short: "Nəticə1", name: "Fərdi Nəticə", description: "Əməkdaşın fərdi KPI nəticəsi.", source: "KPI Kartı" },
  { id: 11, short: "Nəticə2", name: "Komanda Nəticəsi", description: "Komanda üzrə orta KPI nəticəsi.", source: "KPI Kartı" },
  { id: 12, short: "Nəticə3", name: "Struktur Nəticəsi", description: "Struktur (departament) üzrə orta KPI nəticəsi.", source: "KPI Kartı" },
];

const initialFormulas: Formula[] = [
  {
    id: 1,
    name: "Satış Performans Düsturu",
    formula: "(CS / HS) × 100",
    description: "Satış hədəfinin faizlə yerinə yetirilmə nisbəti.",
    variables: ["CS", "HS"],
  },
  {
    id: 2,
    name: "Müştəri Məmnuniyyət İndeksi",
    formula: "(MM / 100) × 100",
    description: "Müştəri sorğusu əsasında məmnuniyyət faizi.",
    variables: ["MM"],
  },
  {
    id: 3,
    name: "Fərdi Performans Balı",
    formula: "(Nəticə1 × 0.6) + (Nəticə2 × 0.4)",
    description: "Fərdi və komanda nəticələrinin çəkiyə əsasən birləşdirilməsi.",
    variables: ["Nəticə1", "Nəticə2"],
  },
  {
    id: 4,
    name: "Satış bonusu düsturu",
    formula: "(Nəticə1 + (Nəticə2 × Çəki)) × (Maaş / 12)",
    description: "Yekun bonus hesablama düsturu — fərdi və komanda nəticələri əsasında aylıq bonus.",
    variables: ["Nəticə1", "Nəticə2", "Çəki", "Maaş"],
  },
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

// Reusable catalog store (localStorage)
// Manages: structure types, positions, evaluation criteria

const KEY_STRUCT_TYPES = "kpi_catalog_struct_types_v1";
const KEY_POSITIONS = "kpi_catalog_positions_v1";
const KEY_CRITERIA = "kpi_catalog_criteria_v1";

const seedStructTypes = ["Departament", "Şöbə", "Sektor", "Qrup", "Komanda"];
const seedPositions = [
  "HR Manager", "HR Mütəxəssisi", "Recruiter", "L&D Specialist",
  "Backend Developer", "Frontend Developer", "QA Engineer", "DevOps Engineer",
  "Marketinq Meneceri", "Content Specialist", "SMM Specialist",
  "Satış Meneceri", "Satış Təmsilçisi", "Satış Analitiki",
  "Mühasib", "Baş Mühasib", "Maliyyə Analitiki",
];
const seedCriteria = [
  "Texniki Bacarıqlar",
  "Komanda İşi",
  "Kommunikasiya",
  "Vaxtında İcra",
  "İnnovasiya",
];

const load = (key: string, fallback: string[]): string[] => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
};

const save = (key: string, value: string[]) => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("catalog-updated"));
};

// --- Structure types ---
export const getStructureTypes = () => load(KEY_STRUCT_TYPES, seedStructTypes);
export const addStructureType = (name: string): { ok: boolean; list: string[] } => {
  const list = getStructureTypes();
  const v = name.trim();
  if (!v) return { ok: false, list };
  if (list.includes(v)) return { ok: false, list };
  const next = [...list, v];
  save(KEY_STRUCT_TYPES, next);
  return { ok: true, list: next };
};
export const removeStructureType = (name: string) => {
  const next = getStructureTypes().filter(t => t !== name);
  save(KEY_STRUCT_TYPES, next);
  return next;
};

// --- Positions ---
export const getPositions = () => load(KEY_POSITIONS, seedPositions);
export const addPositionCatalog = (name: string): { ok: boolean; list: string[] } => {
  const list = getPositions();
  const v = name.trim();
  if (!v) return { ok: false, list };
  if (list.includes(v)) return { ok: false, list };
  const next = [...list, v];
  save(KEY_POSITIONS, next);
  return { ok: true, list: next };
};
export const removePositionCatalog = (name: string) => {
  const next = getPositions().filter(t => t !== name);
  save(KEY_POSITIONS, next);
  return next;
};

// --- Evaluation criteria ---
export const getCriteria = () => load(KEY_CRITERIA, seedCriteria);
export const addCriterion = (name: string) => {
  const list = getCriteria();
  if (!name.trim() || list.includes(name.trim())) return list;
  const next = [...list, name.trim()];
  save(KEY_CRITERIA, next);
  return next;
};
export const removeCriterion = (name: string) => {
  const next = getCriteria().filter(t => t !== name);
  save(KEY_CRITERIA, next);
  return next;
};

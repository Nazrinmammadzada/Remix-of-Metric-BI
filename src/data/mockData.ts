// Mock data for evaluation module (Qiymətləndirmə)

export interface MockEmployee {
  id: string;
  fullName: string;
  department: string;
  position: string;
  email: string;
}

export const mockEmployees: MockEmployee[] = [
  { id: "e1", fullName: "Aysel Məmmədova", department: "İnsan Resursları", position: "HR Mütəxəssisi", email: "aysel.memmedova@company.az" },
  { id: "e2", fullName: "Rəşad Hüseynov", department: "IT", position: "Backend Developer", email: "rasad.huseynov@company.az" },
  { id: "e3", fullName: "Nigar Əliyeva", department: "Marketinq", position: "Marketinq Meneceri", email: "nigar.aliyeva@company.az" },
  { id: "e4", fullName: "Elvin Quliyev", department: "Satış", position: "Satış Təmsilçisi", email: "elvin.quliyev@company.az" },
  { id: "e5", fullName: "Səbinə Cəfərova", department: "Maliyyə", position: "Mühasib", email: "sebine.ceferova@company.az" },
  { id: "e6", fullName: "Tural Abbasov", department: "IT", position: "Frontend Developer", email: "tural.abbasov@company.az" },
  { id: "e7", fullName: "Leyla Həsənova", department: "İnsan Resursları", position: "Recruiter", email: "leyla.hesenova@company.az" },
  { id: "e8", fullName: "Kamran Rzayev", department: "Satış", position: "Satış Meneceri", email: "kamran.rzayev@company.az" },
  // Extra IT staff so peer-assignment (>=3 in dept) works
  { id: "e9", fullName: "Nərmin Vəliyeva", department: "IT", position: "QA Engineer", email: "nermin.veliyeva@company.az" },
  { id: "e10", fullName: "Ramil Səfərov", department: "IT", position: "DevOps Engineer", email: "ramil.seferov@company.az" },
  { id: "e11", fullName: "Günel İsmayılova", department: "Satış", position: "Satış Analitiki", email: "gunel.ismayilova@company.az" },
  { id: "e12", fullName: "Orxan Bayramov", department: "Marketinq", position: "Content Specialist", email: "orxan.bayramov@company.az" },
  { id: "e13", fullName: "Aytac Kərimova", department: "Marketinq", position: "SMM Specialist", email: "aytac.kerimova@company.az" },
  { id: "e14", fullName: "Sənan Əhmədov", department: "Maliyyə", position: "Maliyyə Analitiki", email: "senan.ehmedov@company.az" },
  { id: "e15", fullName: "Ülviyyə Nəbiyeva", department: "Maliyyə", position: "Baş Mühasib", email: "ulviyye.nebiyeva@company.az" },
  { id: "e16", fullName: "Cavid Mustafayev", department: "İnsan Resursları", position: "L&D Specialist", email: "cavid.mustafayev@company.az" },
];

export const getInitials = (fullName: string) =>
  fullName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const EVALUATION_CATEGORIES = [
  { key: "technical", label: "Texniki Bacarıqlar" },
  { key: "teamwork", label: "Komanda İşi" },
  { key: "communication", label: "Kommunikasiya" },
  { key: "timeliness", label: "Vaxtında İcra" },
  { key: "innovation", label: "İnnovasiya" },
] as const;

export type CategoryKey = (typeof EVALUATION_CATEGORIES)[number]["key"];

// Deterministic string hash → seed
const hashString = (s: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % 233280 || 1;
};

// LCG seeded shuffle
const seededShuffle = <T,>(arr: T[], seed: number): T[] => {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * For a given cycle, deterministically assign 2 same-department peers to each reviewer.
 * Department must have >= 3 active employees.
 */
export const buildPeerAssignments = (
  cycleId: string
): Record<string, MockEmployee[]> => {
  const byDept: Record<string, MockEmployee[]> = {};
  mockEmployees.forEach((e) => {
    (byDept[e.department] ||= []).push(e);
  });

  const assignments: Record<string, MockEmployee[]> = {};
  for (const reviewer of mockEmployees) {
    const peers = byDept[reviewer.department].filter((p) => p.id !== reviewer.id);
    if (peers.length < 2) {
      assignments[reviewer.id] = [];
      continue;
    }
    const seed = hashString(`${cycleId}-${reviewer.department}-${reviewer.id}`);
    assignments[reviewer.id] = seededShuffle(peers, seed).slice(0, 2);
  }
  return assignments;
};

// Default cycle id (could be tied to period in real impl)
export const CURRENT_CYCLE_ID = "2026-H1";

// Mock current logged-in users for peer-evaluation flow
// HR profile is treated as a separate employee from the USER profile.
export const MOCK_HR_USER_ID = "e1";   // Aysel Məmmədova — İnsan Resursları
export const MOCK_USER_ID = "e4";      // Elvin Quliyev — Satış

// Backwards-compat (legacy import)
export const MOCK_CURRENT_USER_ID = MOCK_USER_ID;

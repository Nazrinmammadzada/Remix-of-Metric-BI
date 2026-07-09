// Competency Matrix (Səriştə Matrisi) store — localStorage backed.
import { useEffect, useState } from "react";

export type CompetencyStatus = "aktiv" | "qaralama" | "passiv";

export interface CompetencyQuestion {
  id: string;
  text: string;
  weight: number; // 0-100
}

export interface CompetencyAnswer {
  id: string;
  label: string;
  score: number;
}

export interface CompetencyMatrix {
  id: string;
  name: string;
  positions: string[];
  description?: string;
  questions: CompetencyQuestion[];
  answers: CompetencyAnswer[];
  status: CompetencyStatus;
  usedKpiCount?: number;
  createdAt: string;
  updatedAt: string;
}

const KEY = "competency_matrices_v1";
const EVT = "competency-matrices-updated";

const seed: CompetencyMatrix[] = [
  {
    id: "cm-reception",
    name: "Reception əməkdaşı matrisi",
    positions: ["Reception", "Operator"],
    description: "Reception heyəti üçün davranış və ünsiyyət səriştələri.",
    questions: [
      { id: "q1", text: "Xarici görünüş", weight: 20 },
      { id: "q2", text: "Müştəri ilə ünsiyyət", weight: 25 },
      { id: "q3", text: "Nitq mədəniyyəti", weight: 20 },
      { id: "q4", text: "Geyim standartı", weight: 15 },
      { id: "q5", text: "Davranış etikası", weight: 20 },
    ],
    answers: [
      { id: "a1", label: "Tam razıyam", score: 10 },
      { id: "a2", label: "Razıyam", score: 8 },
      { id: "a3", label: "Qismən razıyam", score: 6 },
      { id: "a4", label: "Razı deyiləm", score: 4 },
      { id: "a5", label: "Heç razı deyiləm", score: 0 },
    ],
    status: "aktiv",
    usedKpiCount: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cm-backoffice",
    name: "Back Office matrisi",
    positions: ["Mütəxəssis", "Analitik"],
    questions: [
      { id: "q1", text: "Analitik bacarıq", weight: 25 },
      { id: "q2", text: "Detala diqqət", weight: 20 },
      { id: "q3", text: "Komanda işi", weight: 20 },
      { id: "q4", text: "Vaxtın idarə edilməsi", weight: 15 },
      { id: "q5", text: "Peşəkarlıq", weight: 20 },
    ],
    answers: [
      { id: "a1", label: "Tam razıyam", score: 10 },
      { id: "a2", label: "Razıyam", score: 8 },
      { id: "a3", label: "Qismən razıyam", score: 6 },
      { id: "a4", label: "Razı deyiləm", score: 4 },
      { id: "a5", label: "Heç razı deyiləm", score: 0 },
    ],
    status: "aktiv",
    usedKpiCount: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cm-sales",
    name: "Satış nümayəndəsi matrisi",
    positions: ["Satış nümayəndəsi"],
    questions: [
      { id: "q1", text: "Satış texnikaları", weight: 30 },
      { id: "q2", text: "Müştəri münasibətləri", weight: 25 },
      { id: "q3", text: "Məhsul bilgisi", weight: 20 },
      { id: "q4", text: "Hədəf yönümlülük", weight: 15 },
      { id: "q5", text: "Ünsiyyət", weight: 10 },
    ],
    answers: [
      { id: "a1", label: "Tam razıyam", score: 10 },
      { id: "a2", label: "Razıyam", score: 8 },
      { id: "a3", label: "Qismən razıyam", score: 6 },
      { id: "a4", label: "Razı deyiləm", score: 4 },
      { id: "a5", label: "Heç razı deyiləm", score: 0 },
    ],
    status: "aktiv",
    usedKpiCount: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cm-manager",
    name: "Rəhbər heyət matrisi",
    positions: ["Menecer", "Rəhbər"],
    questions: [
      { id: "q1", text: "Liderlik", weight: 30 },
      { id: "q2", text: "Qərar qəbul etmə", weight: 20 },
      { id: "q3", text: "Strateji düşüncə", weight: 20 },
      { id: "q4", text: "Komanda idarəçiliyi", weight: 20 },
      { id: "q5", text: "Peşəkar etika", weight: 10 },
    ],
    answers: [
      { id: "a1", label: "Tam razıyam", score: 10 },
      { id: "a2", label: "Razıyam", score: 8 },
      { id: "a3", label: "Qismən razıyam", score: 6 },
      { id: "a4", label: "Razı deyiləm", score: 4 },
      { id: "a5", label: "Heç razı deyiləm", score: 0 },
    ],
    status: "aktiv",
    usedKpiCount: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cm-it",
    name: "IT mütəxəssis matrisi",
    positions: ["IT Mütəxəssis"],
    questions: [
      { id: "q1", text: "Texniki bilgi", weight: 35 },
      { id: "q2", text: "Problem həlli", weight: 25 },
      { id: "q3", text: "Kod keyfiyyəti", weight: 20 },
      { id: "q4", text: "Öz-özünə öyrənmə", weight: 20 },
    ],
    answers: [
      { id: "a1", label: "Tam razıyam", score: 10 },
      { id: "a2", label: "Razıyam", score: 8 },
      { id: "a3", label: "Qismən razıyam", score: 6 },
      { id: "a4", label: "Razı deyiləm", score: 4 },
      { id: "a5", label: "Heç razı deyiləm", score: 0 },
    ],
    status: "aktiv",
    usedKpiCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cm-customer",
    name: "Müştəri xidmətləri matrisi",
    positions: ["Müştəri Xidmətləri"],
    questions: [
      { id: "q1", text: "Səbir", weight: 25 },
      { id: "q2", text: "Empatiya", weight: 25 },
      { id: "q3", text: "Problem həlli", weight: 25 },
      { id: "q4", text: "Ünsiyyət", weight: 25 },
    ],
    answers: [
      { id: "a1", label: "Tam razıyam", score: 10 },
      { id: "a2", label: "Razıyam", score: 8 },
      { id: "a3", label: "Qismən razıyam", score: 6 },
      { id: "a4", label: "Razı deyiləm", score: 4 },
      { id: "a5", label: "Heç razı deyiləm", score: 0 },
    ],
    status: "aktiv",
    usedKpiCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cm-hr",
    name: "HR matrisi",
    positions: ["HR Mütəxəssis"],
    questions: [
      { id: "q1", text: "Ünsiyyət", weight: 30 },
      { id: "q2", text: "İnsan resursları biliyi", weight: 30 },
      { id: "q3", text: "Konflikt idarəçiliyi", weight: 20 },
      { id: "q4", text: "Konfidensiallıq", weight: 20 },
    ],
    answers: [
      { id: "a1", label: "Tam razıyam", score: 10 },
      { id: "a2", label: "Razıyam", score: 8 },
      { id: "a3", label: "Qismən razıyam", score: 6 },
      { id: "a4", label: "Razı deyiləm", score: 4 },
      { id: "a5", label: "Heç razı deyiləm", score: 0 },
    ],
    status: "qaralama",
    usedKpiCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "cm-finance",
    name: "Maliyyə matrisi",
    positions: ["Maliyyəçi"],
    questions: [
      { id: "q1", text: "Rəqəmsal analiz", weight: 30 },
      { id: "q2", text: "Diqqətlilik", weight: 30 },
      { id: "q3", text: "Riayət", weight: 20 },
      { id: "q4", text: "Hesabatlıq", weight: 20 },
    ],
    answers: [
      { id: "a1", label: "Tam razıyam", score: 10 },
      { id: "a2", label: "Razıyam", score: 8 },
      { id: "a3", label: "Qismən razıyam", score: 6 },
      { id: "a4", label: "Razı deyiləm", score: 4 },
      { id: "a5", label: "Heç razı deyiləm", score: 0 },
    ],
    status: "qaralama",
    usedKpiCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const load = (): CompetencyMatrix[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
};

const save = (list: CompetencyMatrix[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
};

export const getCompetencyMatrices = (): CompetencyMatrix[] => load();

export const upsertCompetencyMatrix = (
  m: Omit<CompetencyMatrix, "id" | "createdAt" | "updatedAt"> & { id?: string }
): CompetencyMatrix => {
  const list = load();
  const now = new Date().toISOString();
  if (m.id) {
    const idx = list.findIndex(x => x.id === m.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...m, id: list[idx].id, updatedAt: now } as CompetencyMatrix;
      save(list);
      return list[idx];
    }
  }
  const next: CompetencyMatrix = {
    ...m,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  list.unshift(next);
  save(list);
  return next;
};

export const deleteCompetencyMatrix = (id: string) => save(load().filter(x => x.id !== id));

export const duplicateCompetencyMatrix = (id: string) => {
  const list = load();
  const src = list.find(x => x.id === id);
  if (!src) return;
  const copy: CompetencyMatrix = {
    ...src,
    id: crypto.randomUUID(),
    name: `${src.name} (kopya)`,
    status: "qaralama",
    usedKpiCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.unshift(copy);
  save(list);
};

export const archiveCompetencyMatrix = (id: string) => {
  const list = load().map(x => x.id === id ? { ...x, status: "passiv" as CompetencyStatus, updatedAt: new Date().toISOString() } : x);
  save(list);
};

export const useCompetencyMatrices = (): CompetencyMatrix[] => {
  const [rows, setRows] = useState<CompetencyMatrix[]>(() => load());
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

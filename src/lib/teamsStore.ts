// Shared store for teams (used in TeamsPage + KPI creation) and KPI periods
// (used in HR Settings table + KPI period dropdowns). Backed by localStorage so
// items created in one module are immediately visible in another.

export interface TeamMember {
  name: string;
  role: string;
  kpiScore: number;
  avatar: string;
}

export interface Team {
  id: number;
  name: string;
  leader: string;
  leaderAvatar: string;
  kpiResult: number;
  branch: string;
  activeKpi: number;
  completedKpi: number;
  totalKpi: number;
  members: TeamMember[];
}

const TEAMS_KEY = "kpi_teams_v1";
const PERIODS_KEY = "kpi_periods_v1";

const initialTeams: Team[] = [
  {
    id: 1,
    name: "Elite Satış Komandası",
    leader: "Samir Həsənov",
    leaderAvatar: "S",
    kpiResult: 90,
    branch: "Mərkəzi Filial",
    activeKpi: 8,
    completedKpi: 6,
    totalKpi: 10,
    members: [
      { name: "Leyla Məmmədova", role: "Satış Mütəxəssisi", kpiScore: 88, avatar: "L" },
      { name: "Rəşad Əliyev", role: "Satış Mütəxəssisi", kpiScore: 92, avatar: "R" },
      { name: "Nigar Hüseynova", role: "Satış Meneceri", kpiScore: 85, avatar: "N" },
    ],
  },
  {
    id: 2,
    name: "Regional Satış Komandası",
    leader: "Farid Həsənov",
    leaderAvatar: "F",
    kpiResult: 78,
    branch: "Mərkəzi Filial",
    activeKpi: 6,
    completedKpi: 4,
    totalKpi: 8,
    members: [
      { name: "Aysel Quliyeva", role: "Regional Menecer", kpiScore: 80, avatar: "A" },
      { name: "Tural İsmayılov", role: "Satış Agenti", kpiScore: 75, avatar: "T" },
    ],
  },
  {
    id: 3,
    name: "İpoteka Satış Komandası",
    leader: "Emin Məmmədov",
    leaderAvatar: "E",
    kpiResult: 85,
    branch: "Mərkəzi Filial",
    activeKpi: 7,
    completedKpi: 5,
    totalKpi: 9,
    members: [
      { name: "Günel Əlizadə", role: "İpoteka Mütəxəssisi", kpiScore: 87, avatar: "G" },
      { name: "Orxan Məmmədov", role: "İpoteka Mütəxəssisi", kpiScore: 83, avatar: "O" },
    ],
  },
  {
    id: 4,
    name: "Marketinq Komandası",
    leader: "Elvin Rəhimov",
    leaderAvatar: "E",
    kpiResult: 88,
    branch: "Marketinq Departamenti",
    activeKpi: 9,
    completedKpi: 6,
    totalKpi: 11,
    members: [
      { name: "Kamran Quliyev", role: "Rəqəmsal Marketinq Şöbə Müdiri", kpiScore: 92, avatar: "K" },
      { name: "Aynur Cəfərova", role: "Brend Şöbə Müdiri", kpiScore: 85, avatar: "A" },
      { name: "Orxan Bayramov", role: "Marketinq Mütəxəssisi", kpiScore: 82, avatar: "O" },
      { name: "Aytac Kərimova", role: "Brend Mütəxəssisi", kpiScore: 87, avatar: "A" },
    ],
  },
];

export const getTeams = (): Team[] => {
  const saved = localStorage.getItem(TEAMS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Team[];
      // Elvin komandası mövcud deyilsə, əlavə et (seed-i qorumaq üçün).
      if (!parsed.some(t => t.leader === "Elvin Rəhimov")) {
        const elvinTeam = initialTeams.find(t => t.leader === "Elvin Rəhimov");
        if (elvinTeam) {
          const next = [...parsed, elvinTeam];
          localStorage.setItem(TEAMS_KEY, JSON.stringify(next));
          return next;
        }
      }
      return parsed;
    } catch {}
  }
  localStorage.setItem(TEAMS_KEY, JSON.stringify(initialTeams));
  return initialTeams;
};

export const saveTeams = (teams: Team[]) => {
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  window.dispatchEvent(new Event("teams-updated"));
};

export const addTeam = (team: Team) => {
  const teams = getTeams();
  const next = [...teams, team];
  saveTeams(next);
  return next;
};

// ---------- KPI Periods ----------
export interface KpiPeriod {
  id: number;
  durationLabel: string; // e.g. "6 ay", "1 il"
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

const initialPeriods: KpiPeriod[] = [
  { id: 1, durationLabel: "6 ay", startDate: "2026-06-16", endDate: "2026-12-16" },
  { id: 2, durationLabel: "3 ay", startDate: "2026-01-01", endDate: "2026-03-31" },
];

export const getPeriods = (): KpiPeriod[] => {
  const saved = localStorage.getItem(PERIODS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  localStorage.setItem(PERIODS_KEY, JSON.stringify(initialPeriods));
  return initialPeriods;
};

export const savePeriods = (periods: KpiPeriod[]) => {
  localStorage.setItem(PERIODS_KEY, JSON.stringify(periods));
  window.dispatchEvent(new Event("periods-updated"));
};

export const addPeriod = (period: Omit<KpiPeriod, "id">) => {
  const periods = getPeriods();
  const next = [...periods, { ...period, id: Date.now() }];
  savePeriods(next);
  return next;
};

export const deletePeriod = (id: number) => {
  const next = getPeriods().filter((p) => p.id !== id);
  savePeriods(next);
  return next;
};

// Helper to compute month-difference label
export const computeDurationLabel = (startISO: string, endISO: string): string => {
  if (!startISO || !endISO) return "";
  const s = new Date(startISO);
  const e = new Date(endISO);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "";
  let months =
    (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (e.getDate() >= s.getDate()) months += 0;
  if (months <= 0) {
    const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000));
    return `${days} gün`;
  }
  if (months % 12 === 0) return `${months / 12} il`;
  return `${months} ay`;
};

export const formatPeriodRange = (p: KpiPeriod): string => {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  };
  return `${fmt(p.startDate)} – ${fmt(p.endDate)}`;
};

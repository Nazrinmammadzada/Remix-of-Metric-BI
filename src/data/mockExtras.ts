// Extended mock metadata used by the cross-panel scoping layer.
// Maps the existing mockEmployees (e1..e16) into structures, teams and a manager
// hierarchy so that Manager/User panels can show only the data that belongs to them.

import { mockEmployees, type MockEmployee } from "./mockData";

export interface MockStructure {
  id: string;
  name: string;
  managerId: string; // employee id of the head of structure
}

export interface MockTeam {
  id: string;
  name: string;
  structureId: string;
  leaderId: string;       // rəhbər
  memberIds: string[];
}

export const mockStructures: MockStructure[] = [
  { id: "s_sales",  name: "Satış Departamenti",          managerId: "e8"  },
  { id: "s_it",     name: "IT Departamenti",             managerId: "e2"  },
  { id: "s_market", name: "Marketinq Departamenti",      managerId: "e3"  },
  { id: "s_fin",    name: "Maliyyə Departamenti",        managerId: "e15" },
  { id: "s_hr",     name: "İnsan Resursları",            managerId: "e1"  },
];

export const mockTeams: MockTeam[] = [
  { id: "t_sales_elite", name: "Elite Satış Komandası", structureId: "s_sales",  leaderId: "e8",  memberIds: ["e4", "e8", "e11"] },
  { id: "t_it_core",     name: "IT Core Komandası",      structureId: "s_it",     leaderId: "e2",  memberIds: ["e2", "e6", "e9", "e10"] },
  { id: "t_market_team", name: "Marketinq Komandası",    structureId: "s_market", leaderId: "e3",  memberIds: ["e3", "e12", "e13"] },
  { id: "t_fin_team",    name: "Maliyyə Komandası",      structureId: "s_fin",    leaderId: "e15", memberIds: ["e5", "e14", "e15"] },
  { id: "t_hr_team",     name: "HR Komandası",           structureId: "s_hr",     leaderId: "e1",  memberIds: ["e1", "e7", "e16"] },
];

/** managerId tree — every employee → direct manager (department head). */
export const employeeManagerId: Record<string, string | null> = (() => {
  const map: Record<string, string | null> = {};
  for (const s of mockStructures) {
    for (const t of mockTeams.filter(t => t.structureId === s.id)) {
      for (const m of t.memberIds) {
        map[m] = m === s.managerId ? null : s.managerId;
      }
    }
  }
  return map;
})();

export interface EnrichedEmployee extends MockEmployee {
  managerId: string | null;
  structureId: string | null;
  teamIds: string[];
  isManager: boolean;
}

export const enrichedEmployees: EnrichedEmployee[] = mockEmployees.map(e => {
  const teams = mockTeams.filter(t => t.memberIds.includes(e.id));
  const structureId = teams[0]?.structureId ?? null;
  return {
    ...e,
    managerId: employeeManagerId[e.id] ?? null,
    structureId,
    teamIds: teams.map(t => t.id),
    isManager: mockStructures.some(s => s.managerId === e.id) || mockTeams.some(t => t.leaderId === e.id),
  };
});

/** Login email → mock employee id mapping (so AuthUser maps to a known person). */
export const EMAIL_TO_EMPLOYEE_ID: Record<string, string> = {
  "hr@kpi.az":      "e1",  // Aysel Məmmədova (HR rəhbəri)
  "manager@kpi.az": "e8",  // Kamran Rzayev (Satış Meneceri)
  "user@kpi.az":    "e4",  // Elvin Quliyev (Satış Təmsilçisi)
};

export const getEmployeeIdForEmail = (email?: string | null): string | null => {
  if (!email) return null;
  return EMAIL_TO_EMPLOYEE_ID[email.toLowerCase()] ?? null;
};

export const getEnrichedEmployee = (id: string | null | undefined): EnrichedEmployee | null => {
  if (!id) return null;
  return enrichedEmployees.find(e => e.id === id) ?? null;
};

export const getStructureById = (id?: string | null): MockStructure | null =>
  mockStructures.find(s => s.id === id) ?? null;

export const getTeamById = (id?: string | null): MockTeam | null =>
  mockTeams.find(t => t.id === id) ?? null;

export const getTeamsLedBy = (employeeId: string): MockTeam[] =>
  mockTeams.filter(t => t.leaderId === employeeId);

export const getStructuresLedBy = (employeeId: string): MockStructure[] =>
  mockStructures.filter(s => s.managerId === employeeId);

export const getDirectReports = (employeeId: string): EnrichedEmployee[] =>
  enrichedEmployees.filter(e => e.managerId === employeeId);

/** All employees a manager has visibility over: direct reports + their teams' members. */
export const getManagedEmployees = (employeeId: string): EnrichedEmployee[] => {
  const ids = new Set<string>();
  getDirectReports(employeeId).forEach(e => ids.add(e.id));
  getTeamsLedBy(employeeId).forEach(t => t.memberIds.forEach(m => ids.add(m)));
  ids.add(employeeId);
  return enrichedEmployees.filter(e => ids.has(e.id));
};

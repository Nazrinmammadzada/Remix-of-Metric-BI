// Role-aware visibility helpers used by HR / Manager / User panels so that each
// panel sees only the slice of data that belongs to it.

import type { AuthUser } from "@/contexts/AuthContext";
import {
  enrichedEmployees,
  getEmployeeIdForEmail,
  getEnrichedEmployee,
  getManagedEmployees,
  getStructuresLedBy,
  getTeamsLedBy,
  mockStructures,
  mockTeams,
  type EnrichedEmployee,
  type MockStructure,
  type MockTeam,
} from "@/data/mockExtras";
import type { SharedKpiCard } from "./kpiCardStore";
import type { ApprovalItem } from "./approvalsStore";

export const getCurrentEmployeeId = (user: AuthUser | null): string | null =>
  getEmployeeIdForEmail(user?.email);

export const getCurrentEmployee = (user: AuthUser | null): EnrichedEmployee | null =>
  getEnrichedEmployee(getCurrentEmployeeId(user));

// ---------- Employees ----------
export const getVisibleEmployees = (user: AuthUser | null): EnrichedEmployee[] => {
  if (!user) return [];
  if (user.role === "HR" || user.role === "SUPER_ADMIN") return enrichedEmployees;
  const meId = getCurrentEmployeeId(user);
  if (!meId) return [];
  if (user.role === "MANAGER") return getManagedEmployees(meId);
  return enrichedEmployees.filter(e => e.id === meId);
};

// ---------- Structures ----------
export const getVisibleStructures = (user: AuthUser | null): MockStructure[] => {
  if (!user) return [];
  if (user.role === "HR" || user.role === "SUPER_ADMIN") return mockStructures;
  const meId = getCurrentEmployeeId(user);
  if (!meId) return [];
  if (user.role === "MANAGER") {
    const own = getStructuresLedBy(meId);
    if (own.length > 0) return own;
    const me = getEnrichedEmployee(meId);
    return mockStructures.filter(s => s.id === me?.structureId);
  }
  const me = getEnrichedEmployee(meId);
  return mockStructures.filter(s => s.id === me?.structureId);
};

// ---------- Teams ----------
export const getVisibleTeams = (user: AuthUser | null): MockTeam[] => {
  if (!user) return [];
  if (user.role === "HR" || user.role === "SUPER_ADMIN") return mockTeams;
  const meId = getCurrentEmployeeId(user);
  if (!meId) return [];
  if (user.role === "MANAGER") {
    const led = getTeamsLedBy(meId);
    if (led.length > 0) return led;
    return mockTeams.filter(t => t.memberIds.includes(meId));
  }
  return mockTeams.filter(t => t.memberIds.includes(meId));
};

// ---------- KPI cards ----------
export const getVisibleKpiCards = (
  user: AuthUser | null,
  all: SharedKpiCard[],
): SharedKpiCard[] => {
  if (!user) return [];
  if (user.role === "HR" || user.role === "SUPER_ADMIN") return all;
  const meId = getCurrentEmployeeId(user);
  if (!meId) return [];
  if (user.role === "MANAGER") {
    const managed = new Set(getManagedEmployees(meId).map(e => e.id));
    const ledTeamIds = new Set(getTeamsLedBy(meId).map(t => t.id));
    const ledStructureIds = new Set(getStructuresLedBy(meId).map(s => s.id));
    return all.filter(c =>
      c.ownerId === meId
      || c.evaluatorIds.includes(meId)
      || c.assigneeIds.some(a => managed.has(a))
      || c.teamIds.some(t => ledTeamIds.has(t))
      || c.structureIds.some(s => ledStructureIds.has(s)),
    );
  }
  // USER
  return all.filter(c => c.assigneeIds.includes(meId) || c.ownerId === meId || c.evaluatorIds.includes(meId));
};

// ---------- Approvals ----------
export const getVisibleApprovals = (
  user: AuthUser | null,
  all: ApprovalItem[],
): ApprovalItem[] => {
  if (!user) return [];
  if (user.role === "HR" || user.role === "SUPER_ADMIN") return all;
  const meId = getCurrentEmployeeId(user);
  if (!meId) return [];
  if (user.role === "MANAGER") return all.filter(a => a.approverIds.includes(meId));
  return all.filter(a => a.createdBy === meId);
};

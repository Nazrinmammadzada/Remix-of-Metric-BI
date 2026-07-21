// Maps Supabase RBAC permission codes → the module-level permission keys
// used throughout the UI (RouteGuard, Sidebar, hasPermission).

import { ALL_MODULE_KEYS } from "@/lib/modulePermissions";

// Every UI module key mapped to the DB permission codes that unlock it.
const MODULE_KEY_TO_DB_CODES: Record<string, string[]> = {
  home: ["profile.self_manage", "organization.view"],
  organization: ["org_structure.view", "employees.view"],
  kpi: ["kpi.view"],
  kpi_scores: ["kpi.view", "kpi.evaluate"],
  goal_tracking: ["kpi.view"],
  kpi_lifecycle: ["kpi.view"],
  cascading: ["kpi.view", "kpi.assign"],
  teams: ["teams.view"],
  evaluation: ["evaluation_360.view", "evaluation_cycles.view"],
  approvals: ["approval_requests.view"],
  matrix: ["approval_matrices.view"],
  reporting: ["reports.view"],
  whistleblower: ["notifications.view"],
  bonus: ["bonus.view"],
  formulas: ["bonus.configure", "kpi.update"],
  salary: ["bonus.view"],
  integrations: ["integrations.view"],
  settings: ["settings.view"],
};

// Extra non-module UI keys used across the app.
const EXTRA_KEY_TO_DB_CODES: Record<string, string[]> = {
  kpi_own: ["kpi.view"],
  kpi_team: ["kpi.view"],
  teams_compare: ["teams.view"],
  teams_all: ["teams.view", "teams.manage"],
  admin_users: ["users.manage", "users.view", "users.invite"],
};

const ALL_KEY_TO_DB_CODES = { ...MODULE_KEY_TO_DB_CODES, ...EXTRA_KEY_TO_DB_CODES };

export const derivePermissionsFromDbCodes = (dbCodes: string[]): string[] => {
  const set = new Set<string>(dbCodes);
  const uiKeys: string[] = [];
  for (const [uiKey, needed] of Object.entries(ALL_KEY_TO_DB_CODES)) {
    if (needed.some(code => set.has(code))) uiKeys.push(uiKey);
  }
  // Return both the raw codes (for future fine-grained checks) and the UI keys.
  return Array.from(new Set([...dbCodes, ...uiKeys]));
};

export type AppRole = "HR" | "USER" | "SUPER_ADMIN" | "MANAGER";

export const deriveRoleFromDbCodes = (
  dbCodes: string[],
  isPlatformSuperAdmin: boolean,
): AppRole => {
  if (isPlatformSuperAdmin) return "SUPER_ADMIN";
  const set = new Set(dbCodes);
  if (set.has("users.manage") || set.has("roles.manage") || set.has("settings.manage")) return "HR";
  if (set.has("kpi.approve") || set.has("approval_requests.action") || set.has("teams.manage")) return "MANAGER";
  return "USER";
};

export const HR_FULL_UI_PERMISSIONS = [
  ...ALL_MODULE_KEYS,
  "kpi_own",
  "kpi_team",
  "teams_compare",
  "teams_all",
];

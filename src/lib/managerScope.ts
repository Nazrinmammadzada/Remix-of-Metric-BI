// Maps a logged-in user to their orgStore integer employeeId.
// Used by pages that filter data from stores keyed by orgStore ids
// (kpiSetStore, cascadeTreeStore) — separate from mockExtras' string ids.
import type { AuthUser } from "@/contexts/AuthContext";

export const EMAIL_TO_ORG_EMPLOYEE_ID: Record<string, number> = {
  "manager@kpi.az": 4,   // Elvin Rəhimov — Marketinq Direktoru (Manager 1)
  "manager2@kpi.az": 7,  // Kamran Quliyev — Rəqəmsal Marketinq Şöbə Müdiri (Manager 2)
  "user@kpi.az": 3,      // Samir Həsənov — Satış Direktoru
};

export const getCurrentOrgEmployeeId = (user: AuthUser | null): number | null => {
  if (!user) return null;
  return EMAIL_TO_ORG_EMPLOYEE_ID[user.email.toLowerCase()] ?? null;
};

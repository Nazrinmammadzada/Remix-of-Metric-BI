// Employee deactivation business-rule validator.
// Aggregates reasons why an employee cannot be set to "Passiv".

import { getSharedKpiCards, type SharedKpiCard } from "@/lib/kpiCardStore";
import { getStructures, getEmployees, type OrgEmployee, type OrgStructure } from "@/lib/orgStore";

const stripPos = (v?: string) => String(v || "").split(" — ")[0].trim();
const fullName = (e: OrgEmployee) =>
  [e.firstName, e.lastName, e.fatherName].filter(Boolean).join(" ").trim();

const ACTIVE_STATUSES: SharedKpiCard["status"][] = ["aktiv", "tesdiq_gozlenilir", "natamam"];

/** Returns a list of validation reasons (in Azerbaijani). Empty = OK to deactivate. */
export interface DeactivationReason {
  code: "kpi_active" | "approval_chain" | "structure_leader";
  title: string;
  message: string;
  primaryLabel: string; // Action button label
  targetRoute?: string; // where "primary" should navigate
}

export const collectDeactivationReasons = (empId: number): DeactivationReason[] => {
  const emp = getEmployees().find((x) => x.id === empId);
  if (!emp) return [];
  const name = fullName(emp);
  const empKey = `e${empId}`;

  const reasons: DeactivationReason[] = [];
  const cards = getSharedKpiCards();

  // ── Validation 1: Active KPI cards where employee is owner OR assignee
  const activeKpi = cards.some((c) => {
    if (!ACTIVE_STATUSES.includes(c.status)) return false;
    if (c.ownerId === empKey) return true;
    if (c.assigneeIds.includes(empKey)) return true;
    return false;
  });
  if (activeKpi) {
    reasons.push({
      code: "kpi_active",
      title: "Aktiv KPI kartları mövcuddur",
      message:
        "Bu əməkdaşın aktiv KPI kartları mövcuddur. Əməkdaşı passiv etməzdən əvvəl bütün aktiv KPI proseslərini tamamlayın və ya KPI kartlarını başqa əməkdaşa təyin edin.",
      primaryLabel: "KPI kartlarına bax",
      targetRoute: "/hr/kpi/cards",
    });
  }

  // ── Validation 2: In approval chain (setter / evaluator / approver / lifecycle)
  const inChain = cards.some((c) => {
    if (c.evaluatorIds.includes(empKey)) return true;
    if (c.targets.some((t) => stripPos(t.assigner) === name)) return true;
    return false;
  });
  if (inChain) {
    reasons.push({
      code: "approval_chain",
      title: "Əməkdaş təsdiqləmə zəncirində iştirak edir",
      message:
        "Bu əməkdaş hazırda aktiv KPI təsdiqləmə zəncirində iştirak edir. Passiv etməzdən əvvəl təsdiqləmə zənciri yenilənməlidir.",
      primaryLabel: "Zəncirə bax",
      targetRoute: "/hr/approvals",
    });
  }

  // ── Validation 3: Structure leader with active subordinates
  const structures = getStructures();
  const allEmployees = getEmployees();
  const activeById = new Map(allEmployees.map((e) => [e.id, e.active] as const));

  const isLeaderPosition = (positionName: string) => {
    const p = positionName.toLowerCase();
    return (
      p.includes("direktor") ||
      p.includes("rəhbər") ||
      p.includes("müdir") ||
      p.includes("lider")
    );
  };

  const walk = (
    nodes: OrgStructure[],
  ): { leaderOfNode: OrgStructure; subordinateActive: boolean } | null => {
    for (const node of nodes) {
      const leaderHere = node.positions.some(
        (p) => isLeaderPosition(p.name) && p.slots.some((s) => s.employeeId === empId),
      );
      if (leaderHere) {
        // Any active subordinate anywhere below this node (excluding the leader himself)?
        const hasActiveSub = (n: OrgStructure): boolean => {
          for (const pos of n.positions) {
            for (const s of pos.slots) {
              if (s.employeeId != null && s.employeeId !== empId && activeById.get(s.employeeId)) return true;
            }
          }
          return n.children.some(hasActiveSub);
        };
        if (hasActiveSub(node)) return { leaderOfNode: node, subordinateActive: true };
      }
      const child = walk(node.children);
      if (child) return child;
    }
    return null;
  };

  if (walk(structures)) {
    reasons.push({
      code: "structure_leader",
      title: "Əməkdaş struktur rəhbəridir",
      message:
        "Bu əməkdaş struktur rəhbəri kimi təyin olunub. Passiv etməzdən əvvəl tabeliyindəki bütün əməkdaşlar başqa rəhbərə təyin edilməlidir.",
      primaryLabel: "Rəhbəri dəyiş",
      targetRoute: "/hr/organization",
    });
  }

  return reasons;
};

// Manual peer-evaluation assignments created by HR
// Each assignment: HR picks 1 reviewer + 2 reviewees (unique across all assignments) + criteria

const KEY = "manual_peer_assignments_v1";

export interface ManualAssignment {
  id: string;
  reviewerId: string;
  revieweeIds: string[];
  /** legacy: shared criteria for both reviewees */
  criteria?: string[];
  /** per-reviewee criteria map: { [revieweeId]: string[] } */
  criteriaByReviewee?: Record<string, string[]>;
  /** per-reviewee score scale id (overrides default) */
  scaleByReviewee?: Record<string, string>;
  createdAt: number;
  cycleId: string;
}

export const getManualAssignments = (): ManualAssignment[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

export const addManualAssignment = (a: Omit<ManualAssignment, "id" | "createdAt">) => {
  const list = getManualAssignments();
  const next: ManualAssignment = { ...a, id: `ma_${Date.now()}`, createdAt: Date.now() };
  list.push(next);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("manual-assignments-updated"));
  return next;
};

export const removeManualAssignment = (id: string) => {
  const list = getManualAssignments().filter(a => a.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("manual-assignments-updated"));
};

// All reviewee IDs across all assignments — these cannot be picked again
export const getUsedRevieweeIds = (cycleId: string): Set<string> => {
  const set = new Set<string>();
  getManualAssignments()
    .filter(a => a.cycleId === cycleId)
    .forEach(a => a.revieweeIds.forEach(id => set.add(id)));
  return set;
};

// Avtomatik Approval Workflow tetikleyicisi.
// KPI kartındakı bütün Set entry-lər tamamlandıqda (Elvin hədəfləri təyin edib bitirdikdə)
// və kartda Təsdiqləmə Matrisi seçilibsə — sistem avtomatik olaraq
// approval task yaradır (Günelin "Sistem Təsdiqləri" modulunda görünsün deyə)
// və kart statusunu "tesdiq_gozlenilir" olaraq təyin edir.
//
// Manual düymə tələb olunmur — sadəcə Set tamamlandığı anda çağırılır.

import { getKpiSetEntries } from "./kpiSetStore";
import { getSharedKpiCards, setKpiStatus } from "./kpiCardStore";
import { getApprovalMatrices, roleUserMap } from "./matrixStore";
import { enqueueApproval, getApprovals } from "./approvalsStore";
import { mockEmployees } from "@/data/mockData";

const nameToEmployeeId = (name: string): string | null => {
  const target = name.trim().toLowerCase();
  const hit = mockEmployees.find(e => e.fullName.trim().toLowerCase() === target);
  return hit?.id ?? null;
};

/**
 * Verilmiş kartın bütün Set entry-ləri "completed" olubsa və kartda matris varsa,
 * approval workflow-nu başlat. Təkrar çağırışlar təhlükəsizdir — dedupe var.
 */
export const triggerCardApprovalIfComplete = (cardId: number): void => {
  try {
    const entries = getKpiSetEntries().filter(e => e.cardId === cardId);
    if (entries.length === 0) return;
    if (entries.some(e => e.status !== "completed")) return;

    const card = getSharedKpiCards().find(c => c.numericId === cardId);
    if (!card) return;
    if (!card.matrixId) return;
    if (card.status === "tesdiq_gozlenilir" || card.status === "aktiv") return;

    // Eyni kart üçün pending approval varsa təkrar yaratma.
    const existing = getApprovals().find(a => a.kpiCardId === card.id && a.status === "pending");
    if (existing) return;

    const matrix = getApprovalMatrices().find(m => m.id === card.matrixId);
    if (!matrix) return;

    // Matrisdəki bütün approver-ləri employee id-lərinə çevir.
    const approverIds = new Set<string>();
    matrix.steps.forEach(step => {
      step.assignees.forEach(a => {
        const names = a.type === "user" ? [a.name] : (roleUserMap[a.name] || []);
        names.forEach(n => {
          const id = nameToEmployeeId(n);
          if (id) approverIds.add(id);
        });
      });
    });

    // Fallback: ən azı kart sahibi (adətən HR) təsdiqçi olsun ki, approval boş qalmasın.
    if (approverIds.size === 0 && card.ownerId) approverIds.add(card.ownerId);
    if (approverIds.size === 0) return;

    enqueueApproval({
      kpiCardId: card.id,
      kpiName: card.name,
      matrixId: card.matrixId,
      approverIds: Array.from(approverIds),
      createdBy: card.ownerId,
    });

    setKpiStatus(card.id, "tesdiq_gozlenilir", "system", "Set tamamlandı — avtomatik təsdiq axını başladıldı");
  } catch (err) {
    console.warn("triggerCardApprovalIfComplete failed", err);
  }
};

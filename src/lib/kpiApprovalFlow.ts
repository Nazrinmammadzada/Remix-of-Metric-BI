// Avtomatik Approval Workflow tetikleyicisi.
// KPI kartındakı bütün Set entry-lər tamamlandıqda (təyinedici hədəfləri təyin edib bitirdikdə)
// və kartda Təsdiqləmə Matrisi seçilibsə — sistem avtomatik olaraq
// approval task yaradır (matrisdəki şəxslərin "Sistem Təsdiqləri" modulunda görünsün deyə)
// və kart statusunu "tesdiq_gozlenilir" olaraq təyin edir.

import { getKpiSetEntries } from "./kpiSetStore";
import { getSharedKpiCards, setKpiStatus } from "./kpiCardStore";
import { getApprovalMatrices } from "./matrixStore";
import { enqueueApproval, getApprovals } from "./approvalsStore";
import { getKpiCardMeta } from "./kpiCardMetaStore";
import { submitToMatrix } from "./kpiCardStatusStore";
import { getEnrichedEmployee } from "@/data/mockExtras";
import { getEmployees } from "./orgStore";

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Matrisdəki approver adını enrichedEmployees id-sinə çevir.
 * 1) Tam ad üzrə eyni.
 * 2) Alınmasa, ad+soyad-ın hər biri üzrə partial (ilk ad uyğunluğu).
 */
const nameToEmployeeId = (name: string): string | null => {
  const cleanName = String(name || "").split(" — ")[0].trim();
  const target = normalize(cleanName);
  if (!target) return null;
  const orgExact = getEmployees().find(e => normalize(`${e.firstName} ${e.lastName}`) === target);
  if (orgExact) return String(orgExact.id);
  return null;
};

const roleToEmployeeIds = (roleName: string): string[] => {
  const ids = new Set<string>();
  const roleNorm = normalize(roleName);
  getEmployees().forEach(e => {
    const pos = normalize(e.positionName || "");
    if (pos === roleNorm) ids.add(String(e.id));
  });
  return Array.from(ids);
};

interface CardContext {
  id: string;              // approval-a yazılacaq stable id
  name: string;
  matrixId: string;
  ownerId: string;
  currentStatus?: string;
}

const resolveCardContext = (cardId: number): CardContext | null => {
  // 1) SharedKpiCard varsa oradan.
  const shared = getSharedKpiCards().find(c => c.numericId === cardId);
  if (shared) {
    return {
      id: shared.id,
      name: shared.name,
      matrixId: shared.matrixId || "",
      ownerId: shared.ownerId,
      currentStatus: shared.status,
    };
  }
  // 2) HR wizard-in yaratdığı yüngül meta.
  const meta = getKpiCardMeta(cardId);
  if (meta) {
    return {
      id: meta.stringId,
      name: meta.name,
      matrixId: meta.matrixId || "",
      ownerId: meta.ownerId,
    };
  }
  return null;
};

/**
 * Verilmiş kartın bütün Set entry-ləri "completed" olubsa və kartda matris varsa,
 * approval workflow-nu başlat. Matris yoxdursa — birbaşa "aktiv"-ə keçir.
 * Təkrar çağırışlar təhlükəsizdir — dedupe var.
 */
export const triggerCardApprovalIfComplete = (cardId: number): void => {
  try {
    const entries = getKpiSetEntries().filter(e => e.cardId === cardId);
    // If there are Set entries, all must be completed. Otherwise (owner-only card
    // with no target-setters), proceed directly.
    if (entries.length > 0 && entries.some(e => e.status !== "completed")) return;

    const ctx = resolveCardContext(cardId);
    if (!ctx) return;

    if (ctx.currentStatus === "aktiv") return;

    // NO MATRIX — bütün təyinedicilər hədəfləri təyin edib bitirdikdə kart avtomatik "aktiv".
    if (!ctx.matrixId) {
      try { setKpiStatus(ctx.id, "aktiv", "system", "Bütün təyinedicilər hədəfləri təyin etdi"); } catch {}
      void import("./kpiCardsService").then(m => m.flushLocalKpiCardsToCloud()).catch(() => undefined);
      return;
    }

    // Eyni kart üçün pending approval varsa təkrar yaratma.
    const existing = getApprovals().find(a => (a.kpiCardId === ctx.id || a.kpiCardId === `kpi-${cardId}`) && a.status === "pending");
    if (existing) return;

    const matrix = getApprovalMatrices().find(m => m.id === ctx.matrixId);
    if (!matrix) return;

    // Build per-step approver chain (sequential flow). Each matrix step becomes
    // one link in the chain — only the current step's approvers get the task.
    const stepsChain: string[][] = matrix.steps.map(step => {
      const ids = new Set<string>();
      step.assignees.forEach(a => {
          const resolved = a.type === "user"
            ? [nameToEmployeeId(a.name)].filter((id): id is string => !!id)
            : roleToEmployeeIds(a.name);
          resolved.forEach(id => ids.add(id));
      });
      return Array.from(ids);
    }).filter(step => step.length > 0);

    // Fallback: ən azı kart sahibi (HR) təsdiqçi olsun ki, approval boş qalmasın.
    if (stepsChain.length === 0 && ctx.ownerId && getEnrichedEmployee(ctx.ownerId)) stepsChain.push([ctx.ownerId]);
    if (stepsChain.length === 0) return;

    enqueueApproval({
      kpiCardId: ctx.id,
      kpiName: ctx.name,
      matrixId: ctx.matrixId,
      approverIds: stepsChain[0],
      createdBy: ctx.ownerId,
      stepsChain,
    });

    // Həm SharedKpiCard, həm də lokal KpiCard status store-u yenilə.
    try { setKpiStatus(ctx.id, "tesdiq_gozlenilir", "system", "Set tamamlandı — avtomatik təsdiq axını başladıldı"); } catch {}
    try { submitToMatrix(cardId); } catch {}
    void import("./approvalsService").then(m => m.flushApprovalsToCloud()).catch(() => undefined);
    void import("./kpiCardsService").then(m => m.flushLocalKpiCardsToCloud()).catch(() => undefined);
  } catch (err) {
    console.warn("triggerCardApprovalIfComplete failed", err);
  }
};

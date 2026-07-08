// Avtomatik Approval Workflow tetikleyicisi.
// KPI kartındakı bütün Set entry-lər tamamlandıqda (təyinedici hədəfləri təyin edib bitirdikdə)
// və kartda Təsdiqləmə Matrisi seçilibsə — sistem avtomatik olaraq
// approval task yaradır (matrisdəki şəxslərin "Sistem Təsdiqləri" modulunda görünsün deyə)
// və kart statusunu "tesdiq_gozlenilir" olaraq təyin edir.

import { getKpiSetEntries } from "./kpiSetStore";
import { getSharedKpiCards, setKpiStatus } from "./kpiCardStore";
import { getApprovalMatrices, roleUserMap } from "./matrixStore";
import { enqueueApproval, getApprovals } from "./approvalsStore";
import { getKpiCardMeta } from "./kpiCardMetaStore";
import { setKpiStatus as setKpiCardStatus } from "./kpiCardStatusStore";
import { enrichedEmployees } from "@/data/mockExtras";

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Matrisdəki approver adını enrichedEmployees id-sinə çevir.
 * 1) Tam ad üzrə eyni.
 * 2) Alınmasa, ad+soyad-ın hər biri üzrə partial (ilk ad uyğunluğu).
 */
const nameToEmployeeId = (name: string): string | null => {
  const target = normalize(name);
  if (!target) return null;
  const exact = enrichedEmployees.find(e => normalize(e.fullName) === target);
  if (exact) return exact.id;
  // Partial: ilk sözü (ad) və ya sonuncu sözü (soyad) uyğun gələn ilk şəxs.
  const parts = target.split(" ").filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  const partial = enrichedEmployees.find(e => {
    const ep = normalize(e.fullName).split(" ").filter(Boolean);
    return ep.includes(first) || ep.includes(last);
  });
  return partial?.id ?? null;
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
  if (shared && shared.matrixId) {
    return {
      id: shared.id,
      name: shared.name,
      matrixId: shared.matrixId,
      ownerId: shared.ownerId,
      currentStatus: shared.status,
    };
  }
  // 2) HR wizard-in yaratdığı yüngül meta.
  const meta = getKpiCardMeta(cardId);
  if (meta && meta.matrixId) {
    return {
      id: meta.stringId,
      name: meta.name,
      matrixId: meta.matrixId,
      ownerId: meta.ownerId,
    };
  }
  return null;
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

    const ctx = resolveCardContext(cardId);
    if (!ctx) return;

    if (ctx.currentStatus === "tesdiq_gozlenilir" || ctx.currentStatus === "aktiv") return;

    // Eyni kart üçün pending approval varsa təkrar yaratma.
    const existing = getApprovals().find(a => a.kpiCardId === ctx.id && a.status === "pending");
    if (existing) return;

    const matrix = getApprovalMatrices().find(m => m.id === ctx.matrixId);
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

    // Fallback: ən azı kart sahibi (HR) təsdiqçi olsun ki, approval boş qalmasın.
    if (approverIds.size === 0 && ctx.ownerId) approverIds.add(ctx.ownerId);
    if (approverIds.size === 0) return;

    enqueueApproval({
      kpiCardId: ctx.id,
      kpiName: ctx.name,
      matrixId: ctx.matrixId,
      approverIds: Array.from(approverIds),
      createdBy: ctx.ownerId,
    });

    // Həm SharedKpiCard, həm də lokal KpiCard status store-u yenilə.
    try { setKpiStatus(ctx.id, "tesdiq_gozlenilir", "system", "Set tamamlandı — avtomatik təsdiq axını başladıldı"); } catch {}
    try {
      setKpiCardStatus({
        card_id: cardId,
        status: "tesdiq_gozlenilir",
        submitted_for_approval: true,
      } as any);
    } catch {}
  } catch (err) {
    console.warn("triggerCardApprovalIfComplete failed", err);
  }
};

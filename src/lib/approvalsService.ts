// Approvals & Matrices cloud service — mirrors localStorage-backed stores
// (approval matrices, deletion matrices, cascade matrices, approval queue)
// into Supabase, hydrating on login and flushing on local changes.

import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/auditService";

const APPROVAL_KEY = "kpi_approval_matrices_v3";
const DELETION_KEY = "kpi_deletion_matrices_v3";
const CASCADE_KEY = "cascade_matrices_v2";
const QUEUE_KEY = "kpi_approval_queue_v2";

const MATRIX_EVT = "matrix:updated";
const CASCADE_EVT = "cascade-matrix-updated";
const QUEUE_EVT = "kpi-approval-queue-updated";

const readLocal = <T>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
};
const writeLocal = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
};

// ── HYDRATE ─────────────────────────────────────────────────────────────────
export const hydrateApprovalsFromCloud = async (orgId: string): Promise<void> => {
  const [amRes, dmRes, cmRes, aqRes] = await Promise.all([
    supabase.from("approval_matrices").select("*").eq("organization_id", orgId),
    supabase.from("deletion_matrices").select("*").eq("organization_id", orgId),
    supabase.from("cascade_matrices").select("*").eq("organization_id", orgId),
    supabase.from("approval_queue").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
  ]);

  if (!amRes.error && amRes.data && amRes.data.length > 0) {
    writeLocal(APPROVAL_KEY, amRes.data.map(r => ({
      id: r.local_id,
      name: r.name,
      mode: r.mode ?? undefined,
      steps: r.steps ?? [],
      updatedAt: r.updated_at,
    })));
  }
  if (!dmRes.error && dmRes.data && dmRes.data.length > 0) {
    writeLocal(DELETION_KEY, dmRes.data.map(r => ({
      id: r.local_id,
      name: r.name,
      mode: r.mode ?? undefined,
      approver: r.approver ?? null,
      minApprovals: r.min_approvals ?? undefined,
      updatedAt: r.updated_at,
    })));
  }
  if (!cmRes.error && cmRes.data && cmRes.data.length > 0) {
    writeLocal(CASCADE_KEY, cmRes.data.map(r => ({
      id: r.local_id,
      name: r.name,
      scopeType: r.scope_type,
      scopeName: r.scope_name,
      sharedPersons: r.shared_persons ?? [],
      updatedAt: r.updated_at,
    })));
  }
  if (!aqRes.error && aqRes.data && aqRes.data.length > 0) {
    writeLocal(QUEUE_KEY, aqRes.data.map(r => ({
      id: r.local_id,
      kpiCardId: r.kpi_card_local_id,
      kpiName: r.kpi_name,
      matrixId: r.matrix_local_id ?? "",
      approverIds: r.approver_ids ?? [],
      decisions: r.decisions ?? {},
      status: r.status,
      stepsChain: r.steps_chain ?? undefined,
      currentStep: r.current_step ?? undefined,
      createdBy: r.created_by ?? "",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));
  }

  // Notify UI hooks to re-read.
  window.dispatchEvent(new Event(MATRIX_EVT));
  window.dispatchEvent(new Event(CASCADE_EVT));
  window.dispatchEvent(new Event(QUEUE_EVT));
};

// ── FLUSH ───────────────────────────────────────────────────────────────────
let currentOrgId: string | null = null;
let flushTimer: number | null = null;

const scheduleFlush = () => {
  if (!currentOrgId) return;
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => { flushTimer = null; void flushApprovalsToCloud(); }, 500);
};

export const flushApprovalsToCloud = async () => {
  const orgId = currentOrgId;
  if (!orgId) return;

  const approvals = readLocal<any[]>(APPROVAL_KEY, []);
  const deletions = readLocal<any[]>(DELETION_KEY, []);
  const cascades = readLocal<any[]>(CASCADE_KEY, []);
  const queue = readLocal<any[]>(QUEUE_KEY, []);

  await Promise.all([
    approvals.length ? supabase.from("approval_matrices").upsert(
      approvals.map(m => ({
        organization_id: orgId,
        local_id: m.id,
        name: m.name,
        mode: m.mode ?? null,
        steps: m.steps ?? [],
      })),
      { onConflict: "organization_id,local_id" },
    ) : Promise.resolve(),
    deletions.length ? supabase.from("deletion_matrices").upsert(
      deletions.map(m => ({
        organization_id: orgId,
        local_id: m.id,
        name: m.name,
        mode: m.mode ?? null,
        approver: m.approver ?? null,
        min_approvals: m.minApprovals ?? null,
      })),
      { onConflict: "organization_id,local_id" },
    ) : Promise.resolve(),
    cascades.length ? supabase.from("cascade_matrices").upsert(
      cascades.map(m => ({
        organization_id: orgId,
        local_id: m.id,
        name: m.name,
        scope_type: m.scopeType,
        scope_name: m.scopeName,
        shared_persons: m.sharedPersons ?? [],
      })),
      { onConflict: "organization_id,local_id" },
    ) : Promise.resolve(),
    queue.length ? supabase.from("approval_queue").upsert(
      queue.map(a => ({
        organization_id: orgId,
        local_id: a.id,
        kpi_card_local_id: a.kpiCardId,
        kpi_name: a.kpiName,
        matrix_local_id: a.matrixId || null,
        approver_ids: a.approverIds ?? [],
        decisions: a.decisions ?? {},
        status: a.status ?? "pending",
        steps_chain: a.stepsChain ?? null,
        current_step: a.currentStep ?? null,
        created_by: a.createdBy ?? null,
      })),
      { onConflict: "organization_id,local_id" },
    ) : Promise.resolve(),
  ]);
  void logAudit({
    organizationId: orgId,
    action: "sync",
    module: "approvals",
    metadata: {
      approvals: approvals.length,
      deletions: deletions.length,
      cascades: cascades.length,
      queue: queue.length,
    },
  });
};

// ── LIFECYCLE ───────────────────────────────────────────────────────────────
export const activateApprovalsSync = async (orgId: string) => {
  if (currentOrgId === orgId) return;
  currentOrgId = orgId;
  await hydrateApprovalsFromCloud(orgId);
  window.addEventListener(MATRIX_EVT, scheduleFlush);
  window.addEventListener(CASCADE_EVT, scheduleFlush);
  window.addEventListener(QUEUE_EVT, scheduleFlush);
};

export const deactivateApprovalsSync = () => {
  currentOrgId = null;
  window.removeEventListener(MATRIX_EVT, scheduleFlush);
  window.removeEventListener(CASCADE_EVT, scheduleFlush);
  window.removeEventListener(QUEUE_EVT, scheduleFlush);
  if (flushTimer) { window.clearTimeout(flushTimer); flushTimer = null; }
};

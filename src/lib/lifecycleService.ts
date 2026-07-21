// KPI Lifecycle + Templates cloud service.
// Hydrates from Supabase into localStorage-backed stores, and flushes
// local edits back on change events (kpi-lifecycle-updated / kpi-lifecycle-templates-updated).

import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/auditService";

const LIFECYCLE_KEY = "kpi_lifecycle_v2";
const TEMPLATES_KEY = "kpi_lifecycle_templates_v2";
const LIFECYCLE_EVT = "kpi-lifecycle-updated";
const TEMPLATES_EVT = "kpi-lifecycle-templates-updated";

const readLocal = <T>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
};
const writeLocal = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
};

// ── HYDRATE ─────────────────────────────────────────────────────────────────
export const hydrateLifecycleFromCloud = async (orgId: string): Promise<void> => {
  const [lcRes, tplRes] = await Promise.all([
    supabase.from("kpi_lifecycles").select("*").eq("organization_id", orgId),
    supabase.from("lifecycle_templates").select("*").eq("organization_id", orgId),
  ]);

  if (!lcRes.error && lcRes.data && lcRes.data.length > 0) {
    writeLocal(LIFECYCLE_KEY, lcRes.data.map(r => ({
      cardId: r.card_local_id,
      cardName: r.card_name,
      assignment: r.assignment ?? undefined,
      evaluation: r.evaluation ?? undefined,
      bonus: r.bonus ?? undefined,
      reviews: r.reviews ?? [],
      updatedAt: r.updated_at,
    })));
  }
  if (!tplRes.error && tplRes.data && tplRes.data.length > 0) {
    writeLocal(TEMPLATES_KEY, tplRes.data.map(r => ({
      id: r.local_id,
      name: r.name,
      description: r.description ?? undefined,
      data: r.data ?? {},
      isSystem: r.is_system,
      active: r.active,
      createdAt: r.created_at,
    })));
  }

  window.dispatchEvent(new Event(LIFECYCLE_EVT));
  window.dispatchEvent(new Event(TEMPLATES_EVT));
};

// ── FLUSH ───────────────────────────────────────────────────────────────────
let currentOrgId: string | null = null;
let flushTimer: number | null = null;

const scheduleFlush = () => {
  if (!currentOrgId) return;
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => { flushTimer = null; void flushLifecycleToCloud(); }, 500);
};

export const flushLifecycleToCloud = async () => {
  const orgId = currentOrgId;
  if (!orgId) return;

  const lifecycles = readLocal<any[]>(LIFECYCLE_KEY, []);
  const templates = readLocal<any[]>(TEMPLATES_KEY, []);

  await Promise.all([
    lifecycles.length ? supabase.from("kpi_lifecycles").upsert(
      lifecycles.map(l => ({
        organization_id: orgId,
        card_local_id: l.cardId,
        card_name: l.cardName ?? "",
        assignment: l.assignment ?? null,
        evaluation: l.evaluation ?? null,
        bonus: l.bonus ?? null,
        reviews: l.reviews ?? [],
      })),
      { onConflict: "organization_id,card_local_id" },
    ) : Promise.resolve(),
    templates.length ? supabase.from("lifecycle_templates").upsert(
      templates.map(t => ({
        organization_id: orgId,
        local_id: t.id,
        name: t.name,
        description: t.description ?? null,
        data: t.data ?? {},
        is_system: !!t.isSystem,
        active: t.active !== false,
      })),
      { onConflict: "organization_id,local_id" },
    ) : Promise.resolve(),
  ]);

  void logAudit({
    organizationId: orgId,
    action: "sync",
    module: "lifecycle",
    metadata: { lifecycles: lifecycles.length, templates: templates.length },
  });
};

// ── LIFECYCLE ───────────────────────────────────────────────────────────────
export const activateLifecycleSync = async (orgId: string) => {
  if (currentOrgId === orgId) return;
  currentOrgId = orgId;
  await hydrateLifecycleFromCloud(orgId);
  window.addEventListener(LIFECYCLE_EVT, scheduleFlush);
  window.addEventListener(TEMPLATES_EVT, scheduleFlush);
};

export const deactivateLifecycleSync = () => {
  currentOrgId = null;
  window.removeEventListener(LIFECYCLE_EVT, scheduleFlush);
  window.removeEventListener(TEMPLATES_EVT, scheduleFlush);
  if (flushTimer) { window.clearTimeout(flushTimer); flushTimer = null; }
};

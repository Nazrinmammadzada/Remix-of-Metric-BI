// Phase 1 cloud sync — mirrors the remaining localStorage business stores
// (teams, salaries, salary uploads, formulas, formula assignments, catalogs,
// dropdown catalogs, deletion requests) to Supabase using JSON-payload rows.
//
// Follows the same write-through pattern as approvalsService.ts:
//   - Hydrate: on login, pull cloud rows and overwrite the local cache.
//   - Flush:   on any local change (via a store's custom event), debounce
//              and push the whole payload back to cloud.
//
// This keeps the existing synchronous store APIs working (localStorage as
// cache) while making cloud the source of truth across devices/sessions.

import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/auditService";

// ── Local <-> Cloud key map ─────────────────────────────────────────────────
// One entry per synced store. Each store dispatches `event` when it mutates.
interface StoreMirror {
  localKey: string;
  cloudKey: string;                 // catalog_key column value
  event: string;                    // window event dispatched on mutation
  table: "org_catalogs";            // generic JSON payload table
}

const STORES: StoreMirror[] = [
  { localKey: "kpi_teams_v2",                cloudKey: "teams",                event: "teams:updated",                       table: "org_catalogs" },
  { localKey: "kpi_periods_v1",              cloudKey: "periods",              event: "teams:updated",                       table: "org_catalogs" },
  { localKey: "kpi_salary_records_v3",       cloudKey: "salary_records",       event: "salary:updated",                      table: "org_catalogs" },
  { localKey: "kpi_salary_uploads_v3",       cloudKey: "salary_uploads",       event: "salary-uploads:updated",              table: "org_catalogs" },
  { localKey: "kpi_formulas_v4",             cloudKey: "formulas",             event: "formulas:updated",                    table: "org_catalogs" },
  { localKey: "kpi_formula_variables_v4",    cloudKey: "formula_variables",    event: "formulas:updated",                    table: "org_catalogs" },
  { localKey: "kpi_formula_assignments_v2",  cloudKey: "formula_assignments",  event: "formula-assignments:updated",         table: "org_catalogs" },
  { localKey: "kpi_catalog_v2",              cloudKey: "catalog",              event: "catalog:updated",                     table: "org_catalogs" },
  { localKey: "kpi_dropdown_catalog_v1",     cloudKey: "dropdown_catalog",     event: "dropdown-catalog:updated",            table: "org_catalogs" },
  { localKey: "kpi_deletion_requests_v1",    cloudKey: "deletion_requests",    event: "matrix:updated",                      table: "org_catalogs" },
  { localKey: "kpi_deleted_ids_v1",          cloudKey: "deleted_kpi_ids",      event: "matrix:updated",                      table: "org_catalogs" },
];

const readLocal = <T>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; }
  catch { return fallback; }
};
const writeLocal = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
};

// ── Hydrate ─────────────────────────────────────────────────────────────────
export const hydratePhase1FromCloud = async (orgId: string): Promise<void> => {
  const cloudKeys = STORES.map(s => s.cloudKey);
  const { data, error } = await supabase
    .from("org_catalogs")
    .select("catalog_key, entries")
    .eq("organization_id", orgId)
    .in("catalog_key", cloudKeys);
  if (error || !data) return;

  const byKey = new Map<string, unknown>(data.map(r => [r.catalog_key as string, r.entries]));
  const touchedEvents = new Set<string>();
  for (const store of STORES) {
    const val = byKey.get(store.cloudKey);
    if (val !== undefined && val !== null) {
      writeLocal(store.localKey, val);
      touchedEvents.add(store.event);
    }
  }
  // Notify UI hooks so they re-read their stores.
  touchedEvents.forEach(evt => window.dispatchEvent(new Event(evt)));
};

// ── Flush ───────────────────────────────────────────────────────────────────
let currentOrgId: string | null = null;
const flushTimers = new Map<string, number>();

const scheduleFlush = (cloudKey?: string) => {
  if (!currentOrgId) return;
  const key = cloudKey ?? "*";
  const existing = flushTimers.get(key);
  if (existing) window.clearTimeout(existing);
  const t = window.setTimeout(() => {
    flushTimers.delete(key);
    void flushPhase1ToCloud();
  }, 500);
  flushTimers.set(key, t);
};

export const flushPhase1ToCloud = async () => {
  const orgId = currentOrgId;
  if (!orgId) return;
  const rows = STORES.map(s => ({
    organization_id: orgId,
    catalog_key: s.cloudKey,
    entries: readLocal<unknown>(s.localKey, null),
  })).filter(r => r.entries !== null && r.entries !== undefined);
  if (rows.length === 0) return;

  const { error } = await supabase
    .from("org_catalogs")
    .upsert(rows, { onConflict: "organization_id,catalog_key" });
  if (error) return;
  void logAudit({
    organizationId: orgId,
    action: "sync",
    module: "phase1_catalogs",
    metadata: { rows: rows.length },
  });
};

// ── Lifecycle ───────────────────────────────────────────────────────────────
const listeners: Array<{ event: string; handler: () => void }> = [];

export const activatePhase1Sync = async (orgId: string) => {
  if (currentOrgId === orgId) return;
  currentOrgId = orgId;
  await hydratePhase1FromCloud(orgId);
  // Wire one listener per unique event.
  const unique = new Set(STORES.map(s => s.event));
  unique.forEach(evt => {
    const handler = () => scheduleFlush(evt);
    window.addEventListener(evt, handler);
    listeners.push({ event: evt, handler });
  });
};

export const deactivatePhase1Sync = () => {
  currentOrgId = null;
  while (listeners.length) {
    const { event, handler } = listeners.pop()!;
    window.removeEventListener(event, handler);
  }
  flushTimers.forEach(t => window.clearTimeout(t));
  flushTimers.clear();
};

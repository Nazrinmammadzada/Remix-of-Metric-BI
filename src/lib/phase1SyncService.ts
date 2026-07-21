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
  // Phase 2 — evaluation domain
  { localKey: "peer_reviews_v1",             cloudKey: "peer_reviews",         event: "peer-reviews:updated",                table: "org_catalogs" },
  { localKey: "competency_matrices_v1",      cloudKey: "competency_matrices",  event: "competency-matrices:updated",         table: "org_catalogs" },
  { localKey: "kpi_eval_scales_v2",          cloudKey: "eval_scales",          event: "eval-config-updated",                 table: "org_catalogs" },
  { localKey: "evaluation_surveys_v1",       cloudKey: "evaluation_surveys",   event: "surveys-updated",                     table: "org_catalogs" },
  // Phase 3 — governance domain
  { localKey: "wb_reports_v1",               cloudKey: "wb_reports",           event: "wb:updated",                          table: "org_catalogs" },
  { localKey: "kpi_operations_log_v1",       cloudKey: "operations_log",       event: "operations:updated",                  table: "org_catalogs" },
  { localKey: "cascade_tree_nodes_v4",       cloudKey: "cascade_tree",         event: "cascade-tree-updated",                table: "org_catalogs" },
  { localKey: "cascade_assignments_v2",      cloudKey: "cascade_assignments",  event: "cascade-assignments-updated",         table: "org_catalogs" },
  { localKey: "manual_peer_assignments_v1",  cloudKey: "manual_peer_assignments", event: "manual-assignments-updated",       table: "org_catalogs" },
  // Phase 5 — remaining stores sweep
  { localKey: "kpi_set_entries_v6",          cloudKey: "kpi_set_entries",      event: "kpi-set-updated",                     table: "org_catalogs" },
  { localKey: "kpi_hr_admin_accounts_v1",    cloudKey: "hr_admin_accounts",    event: "hr-admins-updated",                   table: "org_catalogs" },
  { localKey: "kpi_roles_v1",                cloudKey: "roles_catalog",        event: "kpi-roles-updated",                   table: "org_catalogs" },
  { localKey: "kpi_notification_settings_v2", cloudKey: "notification_settings_v2", event: "notification-settings-updated",  table: "org_catalogs" },
  { localKey: "manager_cascade_load_v1",     cloudKey: "manager_cascade_load", event: "manager-cascade-load-updated",        table: "org_catalogs" },
  { localKey: "kpi_companies_v1",            cloudKey: "companies",            event: "companies-updated",                   table: "org_catalogs" },
  { localKey: "user_kpi_subkpis_v3",         cloudKey: "user_kpi_subkpis",     event: "user-kpi-subkpis-updated",            table: "org_catalogs" },
  { localKey: "kpi_card_meta_v1",            cloudKey: "kpi_card_meta",        event: "kpi-cards-updated",                   table: "org_catalogs" },
  { localKey: "kpi_eval_season_open_v1",     cloudKey: "season_open",          event: "season-updated",                      table: "org_catalogs" },
  { localKey: "kpi_card_status_v1",          cloudKey: "kpi_card_status",      event: "kpi-cards-updated",                   table: "org_catalogs" },
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
  type Row = { organization_id: string; catalog_key: string; entries: unknown };
  const rows: Row[] = STORES.map(s => ({
    organization_id: orgId,
    catalog_key: s.cloudKey,
    entries: readLocal<unknown>(s.localKey, null),
  })).filter(r => r.entries !== null && r.entries !== undefined);
  if (rows.length === 0) return;

  const { error } = await supabase
    .from("org_catalogs")
    .upsert(rows as never, { onConflict: "organization_id,catalog_key" });
  if (error) return;
  void logAudit({
    organizationId: orgId,
    action: "sync",
    module: "phase1_catalogs",
    metadata: { rows: rows.length },
  });
};

// ── Lifecycle ───────────────────────────────────────────────────────────────
const trackedLocalKeys = new Set(STORES.map(s => s.localKey));
let originalSetItem: ((key: string, value: string) => void) | null = null;
let originalRemoveItem: ((key: string) => void) | null = null;

const installStoragePatch = () => {
  if (originalSetItem) return;
  originalSetItem = Storage.prototype.setItem;
  originalRemoveItem = Storage.prototype.removeItem;
  const setItem = originalSetItem;
  const removeItem = originalRemoveItem;
  Storage.prototype.setItem = function (key: string, value: string) {
    setItem.call(this, key, value);
    if (this === window.localStorage && trackedLocalKeys.has(key)) scheduleFlush(key);
  };
  Storage.prototype.removeItem = function (key: string) {
    removeItem.call(this, key);
    if (this === window.localStorage && trackedLocalKeys.has(key)) scheduleFlush(key);
  };
};

const uninstallStoragePatch = () => {
  if (originalSetItem) { Storage.prototype.setItem = originalSetItem; originalSetItem = null; }
  if (originalRemoveItem) { Storage.prototype.removeItem = originalRemoveItem; originalRemoveItem = null; }
};

export const activatePhase1Sync = async (orgId: string) => {
  if (currentOrgId === orgId) return;
  currentOrgId = orgId;
  installStoragePatch();
  await hydratePhase1FromCloud(orgId);
};

export const deactivatePhase1Sync = () => {
  currentOrgId = null;
  uninstallStoragePatch();
  flushTimers.forEach(t => window.clearTimeout(t));
  flushTimers.clear();
};

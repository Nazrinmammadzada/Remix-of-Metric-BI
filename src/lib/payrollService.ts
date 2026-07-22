// Salary + Notification-settings cloud sync.
// Hydrates local caches on login and mirrors mutations back to Supabase.

import { supabase } from "@/integrations/supabase/client";
import { getOrgLocalIdForUuid, getOrgUuidForLocalId } from "@/lib/orgService";

const NOTIF_KEY = "kpi_notification_settings_v2";
const SALARY_KEY = "kpi_salary_records_v3";
const UPLOAD_KEY = "kpi_salary_uploads_v3";

const NOTIF_EVT = "notification-settings-updated";
const SALARY_EVT = "salary-updated";
const UPLOAD_EVT = "salary-uploads-updated";

const readLocal = <T>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
};
const writeLocal = (key: string, value: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
};

// ── HYDRATE ─────────────────────────────────────────────────────────────────
export const hydratePayrollFromCloud = async (orgId: string): Promise<void> => {
  const [nsRes, srRes, suRes] = await Promise.all([
    supabase.from("notification_settings").select("*").eq("organization_id", orgId),
    supabase.from("salary_records").select("*").eq("organization_id", orgId).order("legacy_id"),
    supabase.from("salary_uploads").select("*").eq("organization_id", orgId).order("legacy_id"),
  ]);

  suppressFlush = true;
  try {
    if (!nsRes.error && nsRes.data) {
      writeLocal(NOTIF_KEY, nsRes.data.map(r => ({
        id: r.local_id,
        title: r.title,
        description: r.description ?? "",
        enabled: r.enabled,
        channels: r.channels ?? [],
        frequency: r.frequency ?? "on_event",
        sendTime: r.send_time ?? "09:00",
        schedule: r.schedule ?? { kind: r.frequency ?? "on_event", time: r.send_time ?? "09:00" },
        recipients: r.recipients ?? [],
        template: r.template ?? "",
      })));
    }
    if (!srRes.error && srRes.data) {
      writeLocal(SALARY_KEY, srRes.data.map(r => {
        const employeeUuid = (r as any).employee_id as string | null | undefined;
        return {
          id: r.legacy_id,
          employeeId: employeeUuid ? getOrgLocalIdForUuid(orgId, employeeUuid) : r.employee_legacy_id,
          employeeUuid: employeeUuid ?? undefined,
          operator: r.operator ?? "",
          periods: r.periods ?? [],
          createdAt: r.created_at,
        };
      }));
    }
    if (!suRes.error && suRes.data) {
      writeLocal(UPLOAD_KEY, suRes.data.map(r => ({
        id: r.legacy_id,
        operator: r.operator ?? "",
        year: r.year ?? 0,
        month: r.month ?? "",
        status: r.status ?? "Aktiv",
        totalAmount: Number(r.total_amount ?? 0),
        totalRows: r.total_rows ?? 0,
        matched: r.matched ?? 0,
        unmatched: r.unmatched ?? 0,
        fileName: r.file_name ?? "",
        uploadedBy: r.uploaded_by ?? "",
        title: r.title ?? "",
        details: r.details ?? [],
        createdAt: r.created_at,
      })));
    }

    window.dispatchEvent(new Event(NOTIF_EVT));
    window.dispatchEvent(new Event(SALARY_EVT));
    window.dispatchEvent(new Event(UPLOAD_EVT));
  } finally {
    suppressFlush = false;
  }
};

// ── FLUSH ───────────────────────────────────────────────────────────────────
let currentOrgId: string | null = null;
let flushTimer: number | null = null;
let suppressFlush = false;
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let rehydrateTimer: number | null = null;

const scheduleFlush = () => {
  if (suppressFlush || !currentOrgId) return;
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => { flushTimer = null; void flushPayrollToCloud(); }, 500);
};

const scheduleRehydrate = () => {
  if (!currentOrgId) return;
  if (rehydrateTimer) window.clearTimeout(rehydrateTimer);
  rehydrateTimer = window.setTimeout(() => {
    rehydrateTimer = null;
    if (currentOrgId) void hydratePayrollFromCloud(currentOrgId);
  }, 500);
};

export const flushPayrollToCloud = async () => {
  const orgId = currentOrgId;
  if (!orgId) return;

  const notif = readLocal<any[]>(NOTIF_KEY, []);
  const salary = readLocal<any[]>(SALARY_KEY, []);
  const uploads = readLocal<any[]>(UPLOAD_KEY, []);

  await Promise.all([
    notif.length ? supabase.from("notification_settings").upsert(
      notif.map(n => ({
        organization_id: orgId,
        local_id: n.id,
        title: n.title,
        description: n.description ?? "",
        enabled: !!n.enabled,
        channels: n.channels ?? [],
        frequency: n.frequency ?? null,
        send_time: n.sendTime ?? null,
        schedule: n.schedule ?? {},
        recipients: n.recipients ?? [],
        template: n.template ?? "",
      })),
      { onConflict: "organization_id,local_id" },
    ) : Promise.resolve(),
    // Salary records: authoritative replace so removed rows / consolidated
    // duplicates disappear from the DB too.
    (async () => {
      await supabase.from("salary_records").delete().eq("organization_id", orgId);
      if (salary.length) {
        await (supabase.from("salary_records") as any).insert(
          salary.map(s => ({
            organization_id: orgId,
            legacy_id: s.id,
            employee_legacy_id: s.employeeId,
            employee_id: s.employeeUuid ?? getOrgUuidForLocalId(orgId, Number(s.employeeId)) ?? null,
            operator: s.operator ?? null,
            periods: s.periods ?? [],
          })),
        );
      }
    })(),
    uploads.length ? supabase.from("salary_uploads").upsert(
      uploads.map(u => ({
        organization_id: orgId,
        legacy_id: u.id,
        operator: u.operator ?? null,
        year: u.year ?? null,
        month: u.month ?? null,
        status: u.status ?? null,
        total_amount: u.totalAmount ?? null,
        total_rows: u.totalRows ?? null,
        matched: u.matched ?? null,
        unmatched: u.unmatched ?? null,
        file_name: u.fileName ?? null,
        uploaded_by: u.uploadedBy ?? null,
        title: u.title ?? null,
        details: u.details ?? [],
      })),
      { onConflict: "organization_id,legacy_id" },
    ) : Promise.resolve(),
  ]);
};

export const persistSalaryRecordToCloud = async (record: any): Promise<boolean> => {
  const orgId = currentOrgId;
  if (!orgId) return false;
  const employeeUuid = record.employeeUuid ?? getOrgUuidForLocalId(orgId, Number(record.employeeId)) ?? null;
  const table = supabase.from("salary_records") as any;
  let del = table.delete().eq("organization_id", orgId);
  del = employeeUuid ? del.eq("employee_id", employeeUuid) : del.eq("employee_legacy_id", Number(record.employeeId));
  const { error: deleteError } = await del;
  if (deleteError) throw deleteError;

  const { error: insertError } = await table.insert({
    organization_id: orgId,
    legacy_id: record.id,
    employee_legacy_id: record.employeeId,
    employee_id: employeeUuid,
    operator: record.operator ?? null,
    periods: record.periods ?? [],
  });
  if (insertError) throw insertError;
  if (flushTimer) { window.clearTimeout(flushTimer); flushTimer = null; }
  return true;
};

// ── LIFECYCLE ───────────────────────────────────────────────────────────────
export const activatePayrollSync = async (orgId: string) => {
  if (currentOrgId === orgId) return;
  currentOrgId = orgId;
  await hydratePayrollFromCloud(orgId);
  window.addEventListener(NOTIF_EVT, scheduleFlush);
  window.addEventListener(SALARY_EVT, scheduleFlush);
  window.addEventListener(UPLOAD_EVT, scheduleFlush);

  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase
    .channel(`payroll-live-${orgId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "salary_records", filter: `organization_id=eq.${orgId}` }, scheduleRehydrate)
    .on("postgres_changes", { event: "*", schema: "public", table: "salary_uploads", filter: `organization_id=eq.${orgId}` }, scheduleRehydrate)
    .subscribe();
};

export const deactivatePayrollSync = () => {
  currentOrgId = null;
  window.removeEventListener(NOTIF_EVT, scheduleFlush);
  window.removeEventListener(SALARY_EVT, scheduleFlush);
  window.removeEventListener(UPLOAD_EVT, scheduleFlush);
  if (flushTimer) { window.clearTimeout(flushTimer); flushTimer = null; }
  if (rehydrateTimer) { window.clearTimeout(rehydrateTimer); rehydrateTimer = null; }
  if (realtimeChannel) { supabase.removeChannel(realtimeChannel); realtimeChannel = null; }
};

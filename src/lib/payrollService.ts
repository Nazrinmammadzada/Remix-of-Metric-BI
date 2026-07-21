// Salary + Notification-settings cloud sync.
// Hydrates local caches on login and mirrors mutations back to Supabase.

import { supabase } from "@/integrations/supabase/client";

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

  if (!nsRes.error && nsRes.data && nsRes.data.length > 0) {
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
  if (!srRes.error && srRes.data && srRes.data.length > 0) {
    writeLocal(SALARY_KEY, srRes.data.map(r => ({
      id: r.legacy_id,
      employeeId: r.employee_legacy_id,
      operator: r.operator ?? "",
      periods: r.periods ?? [],
      createdAt: r.created_at,
    })));
  }
  if (!suRes.error && suRes.data && suRes.data.length > 0) {
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
};

// ── FLUSH ───────────────────────────────────────────────────────────────────
let currentOrgId: string | null = null;
let flushTimer: number | null = null;

const scheduleFlush = () => {
  if (!currentOrgId) return;
  if (flushTimer) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => { flushTimer = null; void flushPayrollToCloud(); }, 500);
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
    salary.length ? supabase.from("salary_records").upsert(
      salary.map(s => ({
        organization_id: orgId,
        legacy_id: s.id,
        employee_legacy_id: s.employeeId,
        operator: s.operator ?? null,
        periods: s.periods ?? [],
      })),
      { onConflict: "organization_id,legacy_id" },
    ) : Promise.resolve(),
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

// ── LIFECYCLE ───────────────────────────────────────────────────────────────
export const activatePayrollSync = async (orgId: string) => {
  if (currentOrgId === orgId) return;
  currentOrgId = orgId;
  await hydratePayrollFromCloud(orgId);
  window.addEventListener(NOTIF_EVT, scheduleFlush);
  window.addEventListener(SALARY_EVT, scheduleFlush);
  window.addEventListener(UPLOAD_EVT, scheduleFlush);
};

export const deactivatePayrollSync = () => {
  currentOrgId = null;
  window.removeEventListener(NOTIF_EVT, scheduleFlush);
  window.removeEventListener(SALARY_EVT, scheduleFlush);
  window.removeEventListener(UPLOAD_EVT, scheduleFlush);
  if (flushTimer) { window.clearTimeout(flushTimer); flushTimer = null; }
};

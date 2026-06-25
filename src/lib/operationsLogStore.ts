// Operations registry — KPI cards approved/deleted log.
export interface OperationLogEntry {
  id: string;
  kpiName: string;
  team: string;
  period: string; // e.g. "01.01.2025 – 31.03.2025"
  status: "approved" | "deleted";
  at: string;
}

const KEY = "kpi_operations_log_v1";

export const getOperationsLog = (): OperationLogEntry[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
    const seed: OperationLogEntry[] = [
      { id: crypto.randomUUID(), kpiName: "Aylıq Satış Hədəfi", team: "Satış Komandası", period: "01.01.2026 – 31.03.2026", status: "approved", at: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: crypto.randomUUID(), kpiName: "Müştəri Məmnuniyyəti", team: "CRM Komandası", period: "01.01.2026 – 30.06.2026", status: "approved", at: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: crypto.randomUUID(), kpiName: "Köhnə Onlayn Kampaniya", team: "Marketinq", period: "01.07.2025 – 31.12.2025", status: "deleted", at: new Date(Date.now() - 86400000 * 10).toISOString() },
      { id: crypto.randomUUID(), kpiName: "Çağrı Mərkəzi Cavab Müddəti", team: "Operasiyalar", period: "01.04.2026 – 30.06.2026", status: "approved", at: new Date(Date.now() - 86400000 * 1).toISOString() },
    ];
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed;
  } catch { return []; }
};

export const addOperationLog = (entry: Omit<OperationLogEntry, "id" | "at">) => {
  const list = getOperationsLog();
  list.unshift({ ...entry, id: crypto.randomUUID(), at: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("operations:updated"));
};

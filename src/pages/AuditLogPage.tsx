import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listAuditLogs, type AuditLogRow } from "@/lib/auditService";

const MODULES = ["", "auth", "invitations", "kpi_cards", "approvals", "org_structure", "lifecycle", "bonus_runs", "notifications", "payroll"] as const;
const moduleLabel: Record<string, string> = {
  "": "Bütün modullar",
  auth: "Autentifikasiya",
  invitations: "Dəvətlər",
  kpi_cards: "KPI Kartları",
  approvals: "Təsdiqlər / Matrislər",
  org_structure: "Təşkilati Struktur",
  lifecycle: "Lifecycle",
  bonus_runs: "Bonus Hesablamaları",
  notifications: "Bildirişlər",
  payroll: "Əməkhaqqı",
};

const actionBadge: Record<string, string> = {
  create:  "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  update:  "bg-sky-500/10 text-sky-600 border-sky-500/30",
  delete:  "bg-rose-500/10 text-rose-600 border-rose-500/30",
  invite:  "bg-violet-500/10 text-violet-600 border-violet-500/30",
  revoke:  "bg-orange-500/10 text-orange-600 border-orange-500/30",
  sync:    "bg-slate-500/10 text-slate-500 border-slate-500/30",
};

const fmt = (iso: string) => {
  try { return new Date(iso).toLocaleString("az-AZ"); } catch { return iso; }
};

const AuditLogPage = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrgId ?? "";
  const [items, setItems] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<string>("");
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    try {
      const rows = await listAuditLogs({ organizationId: orgId, module: module || undefined, limit: 300 });
      setItems(rows);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [orgId, module]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(r =>
      r.action.toLowerCase().includes(q) ||
      r.module.toLowerCase().includes(q) ||
      (r.entity_type ?? "").toLowerCase().includes(q) ||
      (r.entity_id ?? "").toLowerCase().includes(q) ||
      JSON.stringify(r.metadata ?? {}).toLowerCase().includes(q),
    );
  }, [items, search]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Audit Jurnalı
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Təşkilat üzrə bütün əməliyyat və dəyişikliklərin izlənməsi.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" /> Yenilə
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Axtar..."
            className="pl-8 pr-3 py-2 rounded-md border border-border bg-background text-sm w-64"
          />
        </div>
        <select
          value={module}
          onChange={(e) => setModule(e.target.value)}
          className="rounded-md border border-border bg-background text-sm px-3 py-2"
        >
          {MODULES.map((m) => (
            <option key={m} value={m}>{moduleLabel[m]}</option>
          ))}
        </select>
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length} qeyd</div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Tarix</th>
              <th className="px-4 py-2 font-medium">Modul</th>
              <th className="px-4 py-2 font-medium">Əməliyyat</th>
              <th className="px-4 py-2 font-medium">Obyekt</th>
              <th className="px-4 py-2 font-medium">Detallar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Yüklənir...
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Qeyd tapılmadı</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t border-border/70 hover:bg-muted/30">
                <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{fmt(r.created_at)}</td>
                <td className="px-4 py-2">{moduleLabel[r.module] ?? r.module}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${actionBadge[r.action] ?? "bg-muted text-foreground border-border"}`}>
                    {r.action}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs">
                  {r.entity_type ? <span className="text-muted-foreground">{r.entity_type}</span> : "—"}
                  {r.entity_id ? <span className="ml-1 font-mono">{r.entity_id.slice(0, 8)}</span> : null}
                </td>
                <td className="px-4 py-2 text-xs">
                  <code className="text-[11px] bg-muted/60 px-2 py-1 rounded max-w-md inline-block truncate align-middle">
                    {JSON.stringify(r.metadata ?? {})}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogPage;

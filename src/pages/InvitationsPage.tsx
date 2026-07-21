import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Mail, Plus, Search, ShieldOff, Users2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  buildInvitationLink,
  createInvitation,
  listInvitations,
  OrgInvitation,
  revokeInvitation,
} from "@/lib/invitationsService";

interface RoleRow { id: string; name: string; }

const statusLabel: Record<OrgInvitation["status"], { label: string; cls: string }> = {
  pending:  { label: "Gözləyir",     cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
  accepted: { label: "Qəbul edildi", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  expired:  { label: "Müddəti bitib", cls: "bg-slate-500/10 text-slate-500 border-slate-500/30" },
  revoked:  { label: "Ləğv edildi",  cls: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
};

const InvitationsPage = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrgId ?? "";
  const [items, setItems] = useState<OrgInvitation[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const list = await listInvitations(orgId);
      setItems(list);
    } catch (err: any) {
      toast.error(err?.message || "Dəvətnamələr yüklənmədi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    supabase.from("roles").select("id, name").eq("organization_id", orgId).eq("is_active", true)
      .then(({ data }) => setRoles((data ?? []) as RoleRow[]));
  }, [orgId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i => i.email.toLowerCase().includes(q));
  }, [items, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Etibarlı e-poçt daxil edin");
      return;
    }
    setSubmitting(true);
    try {
      const inv = await createInvitation({ organizationId: orgId, email, roleIds });
      await navigator.clipboard.writeText(buildInvitationLink(inv.token)).catch(() => {});
      toast.success("Dəvətnamə yaradıldı — link kopyalandı");
      setEmail(""); setRoleIds([]); setShowCreate(false);
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Dəvətnamə yaradıla bilmədi");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async (inv: OrgInvitation) => {
    await navigator.clipboard.writeText(buildInvitationLink(inv.token));
    toast.success("Link kopyalandı");
  };

  const handleRevoke = async (inv: OrgInvitation) => {
    if (!confirm(`"${inv.email}" üçün dəvətnamə ləğv olunsun?`)) return;
    try {
      await revokeInvitation(inv.id);
      toast.success("Dəvətnamə ləğv edildi");
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Ləğv edilə bilmədi");
    }
  };

  if (!orgId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Aktiv təşkilat tapılmadı. Dəvətnamələr yalnız təşkilat kontekstində göstərilir.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users2 className="w-5 h-5 text-primary" /> Dəvətnamələr
          </h1>
          <p className="text-sm text-muted-foreground">Təşkilata istifadəçi dəvət edin və onların statusunu izləyin.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Yeni dəvətnamə
        </button>
      </header>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="E-poçt üzrə axtar…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        {loading ? (
          <div className="p-10 flex justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Hələ dəvətnamə yoxdur.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">E-poçt</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Yaradılıb</th>
                <th className="text-left px-4 py-2 font-medium">Bitir</th>
                <th className="text-right px-4 py-2 font-medium">Əməliyyatlar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => {
                const s = statusLabel[inv.status];
                return (
                  <tr key={inv.id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" /> {inv.email}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full border text-xs ${s.cls}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{new Date(inv.created_at).toLocaleString("az-AZ")}</td>
                    <td className="px-4 py-2 text-muted-foreground">{new Date(inv.expires_at).toLocaleDateString("az-AZ")}</td>
                    <td className="px-4 py-2 text-right space-x-1">
                      {inv.status === "pending" && (
                        <>
                          <button
                            onClick={() => copyLink(inv)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-secondary text-xs"
                          >
                            <Copy className="w-3.5 h-3.5" /> Link
                          </button>
                          <button
                            onClick={() => handleRevoke(inv)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-secondary text-xs text-rose-600"
                          >
                            <ShieldOff className="w-3.5 h-3.5" /> Ləğv et
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4">
          <form onSubmit={handleCreate} className="w-full max-w-md rounded-2xl border border-border bg-card p-5 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold">Yeni dəvətnamə</h2>
            <div>
              <label className="text-xs text-muted-foreground">E-poçt</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-border bg-background"
                placeholder="user@example.com"
              />
            </div>
            {roles.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground">Rollar (istəyə bağlı)</label>
                <div className="mt-1 max-h-40 overflow-auto space-y-1 rounded-lg border border-border p-2">
                  {roles.map(r => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={roleIds.includes(r.id)}
                        onChange={e => setRoleIds(prev =>
                          e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id)
                        )}
                        className="w-4 h-4 accent-primary"
                      />
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-secondary">Ləğv et</button>
              <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Yarat
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default InvitationsPage;

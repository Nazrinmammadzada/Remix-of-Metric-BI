import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Users, Search, Check, X, Shield, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchPermissions,
  fetchRolesForOrg,
  fetchOrgMembersWithRoles,
  createOrgRole,
  updateOrgRole,
  deleteOrgRole,
  setRolePermissions,
  setRoleMembers,
  type DbPermission,
  type DbRole,
  type OrgMemberRow,
} from "@/lib/rolesService";

// Human-friendly module labels (AZ).
const MODULE_LABELS: Record<string, string> = {
  approvals: "Təsdiqləmələr",
  audit: "Audit",
  bonus: "Bonus",
  employees: "Əməkdaşlar",
  evaluations: "Qiymətləndirmə",
  integrations: "İnteqrasiyalar",
  kpi: "KPI Kartları",
  lifecycle: "KPI Lifecycle",
  notifications: "Bildirişlər",
  org_structure: "Təşkilati Struktur",
  organization: "Təşkilat",
  profile: "Profil",
  reports: "Hesabatlar",
  roles: "Rollar",
  salary: "Əməkhaqqı",
  settings: "Ayarlar",
  structure: "Struktur",
  teams: "Komandalar",
  users: "İstifadəçilər",
};

const RolesPermissionsTab = () => {
  const { user, hasPermission } = useAuth();
  const orgId = user?.currentOrgId ?? "";
  const canManage = hasPermission("roles.manage") || user?.role === "SUPER_ADMIN" || user?.role === "HR";

  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<DbPermission[]>([]);
  const [roles, setRoles] = useState<DbRole[]>([]);
  const [members, setMembers] = useState<OrgMemberRow[]>([]);

  const [editing, setEditing] = useState<DbRole | null>(null);
  const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [moduleSearch, setModuleSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const [usersRole, setUsersRole] = useState<DbRole | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [pendingMembers, setPendingMembers] = useState<Set<string>>(new Set());
  const [savingMembers, setSavingMembers] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState<{ name: string; description: string; cloneFromRoleId: string }>({
    name: "",
    description: "",
    cloneFromRoleId: "",
  });

  // ── Load ───────────────────────────────────────────────────────────────
  const reload = async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [p, r, m] = await Promise.all([
        fetchPermissions(),
        fetchRolesForOrg(orgId),
        fetchOrgMembersWithRoles(orgId),
      ]);
      setPermissions(p);
      setRoles(r);
      setMembers(m);
    } catch (e: any) {
      toast.error(`Rollar yüklənmədi: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void reload(); /* eslint-disable-next-line */ }, [orgId]);

  const modules = useMemo(() => {
    const set = new Set(permissions.map(p => p.module));
    return Array.from(set).sort();
  }, [permissions]);
  useEffect(() => {
    if (!selectedModule && modules.length) setSelectedModule(modules[0]);
  }, [modules, selectedModule]);

  const permByModule = useMemo(() => {
    const map = new Map<string, DbPermission[]>();
    for (const p of permissions) {
      const arr = map.get(p.module) ?? [];
      arr.push(p);
      map.set(p.module, arr);
    }
    return map;
  }, [permissions]);

  const memberCountByRole = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of members) for (const rid of m.roleIds) map.set(rid, (map.get(rid) ?? 0) + 1);
    return map;
  }, [members]);

  // ── Edit permissions ───────────────────────────────────────────────────
  const openEdit = (r: DbRole) => {
    setEditing(r);
    setEditingIds(new Set(r.permissionIds));
    setSelectedModule(modules[0] ?? "");
    setModuleSearch("");
  };
  const togglePerm = (id: string) => {
    setEditingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleModuleAll = (mod: string) => {
    const list = permByModule.get(mod) ?? [];
    const allOn = list.every(p => editingIds.has(p.id));
    setEditingIds(prev => {
      const next = new Set(prev);
      for (const p of list) {
        if (allOn) next.delete(p.id); else next.add(p.id);
      }
      return next;
    });
  };
  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error("Rol adı mütləqdir"); return; }
    setSaving(true);
    try {
      await updateOrgRole(editing.id, {
        name: editing.name,
        description: editing.description || null,
      });
      await setRolePermissions(editing.id, Array.from(editingIds));
      toast.success("Rol və icazələr backend-də yadda saxlanıldı");
      setEditing(null);
      await reload();
    } catch (e: any) {
      toast.error(`Xəta: ${e?.message ?? e}`);
    } finally { setSaving(false); }
  };

  // ── Users on role ──────────────────────────────────────────────────────
  const openUsers = (r: DbRole) => {
    setUsersRole(r);
    setUserSearch("");
    setPendingMembers(new Set(members.filter(m => m.roleIds.includes(r.id)).map(m => m.memberId)));
  };
  const toggleMember = (mid: string) => {
    setPendingMembers(prev => {
      const next = new Set(prev);
      if (next.has(mid)) next.delete(mid); else next.add(mid);
      return next;
    });
  };
  const saveMembers = async () => {
    if (!usersRole) return;
    setSavingMembers(true);
    try {
      await setRoleMembers(usersRole.id, Array.from(pendingMembers), user?.supabaseUserId ?? null);
      toast.success("İstifadəçi təyinatları yadda saxlanıldı");
      setUsersRole(null);
      await reload();
    } catch (e: any) {
      toast.error(`Xəta: ${e?.message ?? e}`);
    } finally { setSavingMembers(false); }
  };

  // ── Create / delete ────────────────────────────────────────────────────
  const submitCreate = async () => {
    if (!orgId) return;
    if (!newRole.name.trim()) { toast.error("Rol adı mütləqdir"); return; }
    try {
      await createOrgRole(orgId, {
        name: newRole.name,
        description: newRole.description,
        cloneFromRoleId: newRole.cloneFromRoleId || null,
      });
      toast.success("Rol yaradıldı");
      setShowCreate(false);
      setNewRole({ name: "", description: "", cloneFromRoleId: "" });
      await reload();
    } catch (e: any) {
      toast.error(`Xəta: ${e?.message ?? e}`);
    }
  };

  const removeRole = async (r: DbRole) => {
    if (r.is_system_role) {
      toast.error("Default HR / USER / MANAGER rolları silinə bilməz"); return;
    }
    if (!confirm(`"${r.name}" rolu silinsin?`)) return;
    try {
      await deleteOrgRole(r.id);
      toast.success("Rol silindi");
      await reload();
    } catch (e: any) {
      toast.error(`Xəta: ${e?.message ?? e}`);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (!orgId) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border text-sm text-muted-foreground">
        Təşkilat seçilməyib. RBAC idarəetməsi üçün təşkilat konteksti tələb olunur.
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-6 border border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Rollar və İcazələr</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Default rollar: HR, USER, MANAGER. Rollara əməkdaş təyin edin, icazələri dəyişin və yeni custom rol yaradın.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Yeni Rol Yarat
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Yüklənir...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {roles.map(r => {
            const isSystem = r.is_system_role;
            const memberCount = memberCountByRole.get(r.id) ?? 0;
            return (
              <div
                key={r.id}
                className="group relative border border-border rounded-xl p-5 bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 flex flex-col"
              >
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  {canManage && (
                    <button
                      onClick={() => openUsers(r)}
                      className="p-1.5 rounded-md bg-background border border-border hover:bg-secondary"
                      title="İstifadəçiləri idarə et"
                    >
                      <Users className="w-3.5 h-3.5 text-primary" />
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() => openEdit(r)}
                      className="p-1.5 rounded-md bg-background border border-border hover:bg-secondary"
                      title="Rolu və icazələri redaktə et"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                  {!isSystem && canManage && (
                    <button
                      onClick={() => removeRole(r)}
                      className="p-1.5 rounded-md bg-background border border-border hover:bg-zone-red-bg"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                </div>

                <div className="flex items-start gap-3 mb-3 pr-16">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold tracking-wider text-sm text-foreground truncate">{r.name}</h4>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {isSystem && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider font-semibold">Sistem</span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[2rem]">
                  {r.description || "Təsvir əlavə edilməyib"}
                </p>

                <div className="mt-auto flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                    <Users className="w-3 h-3" /> {memberCount} istifadəçi
                  </span>
                  <button
                    onClick={() => openEdit(r)}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-border text-muted-foreground font-medium hover:bg-secondary"
                  >
                    {r.permissionIds.length}/{permissions.length} icazə
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Yeni Rol Yarat</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rol Adı</label>
              <input
                value={newRole.name}
                onChange={e => setNewRole(p => ({ ...p, name: e.target.value }))}
                placeholder="Məsələn: Marketinq Meneceri"
                className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Təsvir</label>
              <textarea
                value={newRole.description}
                onChange={e => setNewRole(p => ({ ...p, description: e.target.value }))}
                rows={2}
                className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Şablon əsasında kopyala (istəyə bağlı)</label>
              <select
                value={newRole.cloneFromRoleId}
                onChange={e => setNewRole(p => ({ ...p, cloneFromRoleId: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background"
              >
                <option value="">— Boş rol —</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Seçilən rolun bütün icazələri yeni rola köçürüləcək; sonradan redaktə edə bilərsiniz.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={submitCreate} className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium">
                Yarat
              </button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card">
                Ləğv Et
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit permissions dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              <span className="italic font-bold tracking-wider text-primary">{editing?.name}</span>
              <span className="text-foreground"> — İcazə kataloqu</span>
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border bg-secondary/40 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Başlıq</label>
                    <input
                      value={editing.name}
                      onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value.toUpperCase() } : prev)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background uppercase tracking-wider font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Təsvir</label>
                    <input
                      value={editing.description || ""}
                      onChange={e => setEditing(prev => prev ? { ...prev, description: e.target.value } : prev)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <button
                    type="button"
                    onClick={() => setEditingIds(prev => prev.size === permissions.length ? new Set() : new Set(permissions.map(p => p.id)))}
                    className="flex items-center gap-3 text-left"
                  >
                    <span className={`w-10 h-5 rounded-full transition-colors ${editingIds.size === permissions.length ? "bg-primary" : "bg-muted"}`}>
                      <span className={`block w-4 h-4 mt-0.5 rounded-full bg-card shadow transition-transform ${editingIds.size === permissions.length ? "translate-x-5" : "translate-x-0.5"}`} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-foreground">Bütün icazələri seç</span>
                      <span className="block text-[11px] text-muted-foreground">Bütün modullarda bütün icazələri bir kliklə yandır/söndür</span>
                    </span>
                  </button>
                  <span className="text-sm font-bold text-primary">{editingIds.size} / {permissions.length}</span>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4 min-h-[420px]">
                {/* Module list */}
                <div className="col-span-4 border border-border rounded-lg p-3 flex flex-col">
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-muted-foreground" />
                    <input
                      value={moduleSearch}
                      onChange={e => setModuleSearch(e.target.value)}
                      placeholder="Modul axtar..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded bg-background"
                    />
                  </div>
                  <div className="overflow-y-auto flex-1 space-y-1">
                    {modules
                      .filter(m => (MODULE_LABELS[m] ?? m).toLowerCase().includes(moduleSearch.toLowerCase()))
                      .map(m => {
                        const list = permByModule.get(m) ?? [];
                        const on = list.filter(p => editingIds.has(p.id)).length;
                        const active = m === selectedModule;
                        return (
                          <button
                            key={m}
                            onClick={() => setSelectedModule(m)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors ${
                              active ? "bg-primary/10 text-primary font-medium" : "hover:bg-secondary"
                            }`}
                          >
                            <span>{MODULE_LABELS[m] ?? m}</span>
                            <span className="text-[11px] text-muted-foreground">{on}/{list.length}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                {/* Permissions for selected module */}
                <div className="col-span-8 border border-border rounded-lg p-4 flex flex-col">
                  {(() => {
                    const list = permByModule.get(selectedModule) ?? [];
                    const allOn = list.length > 0 && list.every(p => editingIds.has(p.id));
                    return (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold">{MODULE_LABELS[selectedModule] ?? selectedModule}</h4>
                          {list.length > 0 && (
                            <button
                              onClick={() => toggleModuleAll(selectedModule)}
                              className="text-xs px-2.5 py-1 rounded border border-border hover:bg-secondary"
                            >
                              {allOn ? "Hamısını sil" : "Hamısını seç"}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto">
                          {list.map(p => {
                            const on = editingIds.has(p.id);
                            return (
                              <button
                                key={p.id}
                                onClick={() => togglePerm(p.id)}
                                className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                                  on ? "bg-primary/5 border-primary/40" : "bg-background border-border hover:bg-secondary"
                                }`}
                              >
                                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  on ? "bg-primary border-primary text-primary-foreground" : "border-border"
                                }`}>
                                  {on && <Check className="w-3 h-3" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{p.description || p.code}</div>
                                  <div className="text-[11px] text-muted-foreground truncate">{p.code}</div>
                                </div>
                              </button>
                            );
                          })}
                          {list.length === 0 && (
                            <div className="text-sm text-muted-foreground">Bu modulda icazə tapılmadı.</div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-60"
                >
                  {saving ? "Saxlanılır..." : "Yadda Saxla"}
                </button>
                <button onClick={() => setEditing(null)} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card">
                  Bağla
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Users dialog */}
      <Dialog open={!!usersRole} onOpenChange={() => setUsersRole(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              <span className="tracking-wider font-bold text-primary">{usersRole?.name}</span>
              <span className="text-foreground"> — İstifadəçiləri idarə et</span>
            </DialogTitle>
          </DialogHeader>
          {usersRole && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Ad, email və ya vəzifə üzrə axtar..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
              </div>
              <div className="max-h-[420px] overflow-y-auto space-y-1 border border-border rounded-lg p-2">
                {members
                  .filter(m => {
                    const q = userSearch.toLowerCase();
                    return !q ||
                      m.fullName.toLowerCase().includes(q) ||
                      m.email.toLowerCase().includes(q) ||
                      m.positionName.toLowerCase().includes(q);
                  })
                  .map(m => {
                    const on = pendingMembers.has(m.memberId);
                    const assignedRoleNames = roles.filter(r => m.roleIds.includes(r.id)).map(r => r.name).join(", ");
                    return (
                      <button
                        key={m.memberId}
                        onClick={() => toggleMember(m.memberId)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                          on ? "bg-primary/5" : "hover:bg-secondary"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          on ? "bg-primary border-primary text-primary-foreground" : "border-border"
                        }`}>
                          {on && <Check className="w-3 h-3" />}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {(m.fullName[0] || "?").toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{m.fullName}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {m.positionName || "—"}{m.email ? ` · ${m.email}` : ""}
                          </div>
                          <div className="text-[10px] text-primary truncate mt-0.5">
                            Profil rolları: {assignedRoleNames || "rol yoxdur"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                {members.length === 0 && (
                  <div className="text-sm text-muted-foreground p-3">Təşkilatda aktiv əməkdaş tapılmadı.</div>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={saveMembers}
                  disabled={savingMembers}
                  className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-60"
                >
                  {savingMembers ? "Saxlanılır..." : "Yadda Saxla"}
                </button>
                <button onClick={() => setUsersRole(null)} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card">
                  Bağla
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesPermissionsTab;

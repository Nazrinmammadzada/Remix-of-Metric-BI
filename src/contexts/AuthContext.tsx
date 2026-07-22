import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_MODULE_KEYS } from "@/lib/modulePermissions";
import {
  derivePermissionsFromDbCodes,
  type AppRole,
} from "@/lib/permissionMapping";

import { activateOrgSync, deactivateOrgSync } from "@/lib/orgService";
import { activateKpiCardsSync, deactivateKpiCardsSync } from "@/lib/kpiCardsService";
import { activateApprovalsSync, deactivateApprovalsSync } from "@/lib/approvalsService";
import { activatePayrollSync, deactivatePayrollSync } from "@/lib/payrollService";
import { activateLifecycleSync, deactivateLifecycleSync } from "@/lib/lifecycleService";
import { activateNotificationsSync, deactivateNotificationsSync } from "@/lib/notificationsService";
import { activateTeamsSync, deactivateTeamsSync } from "@/lib/teamsService";
import { activatePhase1Sync, deactivatePhase1Sync } from "@/lib/phase1SyncService";
import { hydrateLanguageFromProfile } from "@/lib/languageService";
import { logAudit } from "@/lib/auditService";
// ALL_MODULE_KEYS is intentionally kept imported to preserve the module surface constants
// referenced elsewhere via re-export patterns.
void ALL_MODULE_KEYS;


export interface OrgMembership {
  organizationId: string;
  organizationName: string;
}

export interface AuthUser {
  name: string;
  email: string;
  role: AppRole;
  avatar: string;
  department: string;
  team: string;
  permissions: string[];
  mustChangePassword?: boolean;
  supabaseUserId?: string;
  currentOrgId?: string;
  organizations?: OrgMembership[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  hasPermission: () => false,
  changePassword: async () => ({ success: false }),
  sendPasswordReset: async () => ({ success: false }),
});

export const useAuth = () => useContext(AuthContext);


// ── Fetch org memberships for a Supabase-authenticated user. ──────────────────
const fetchOrgMemberships = async (userId: string): Promise<OrgMembership[]> => {
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(id, name)")
    .eq("user_id", userId)
    .eq("status", "active");
  if (!data) return [];
  return data
    .map((row: any) => ({
      organizationId: row.organization_id as string,
      organizationName: (row.organizations?.name as string) ?? "—",
    }))
    .filter(m => !!m.organizationId);
};

// ── Fetch the DB permission codes + role slugs granted to a user in an org. ──
const fetchRoleDataForOrg = async (
  userId: string,
  orgId: string,
): Promise<{ codes: string[]; roleCodes: string[] }> => {
  const { data } = await supabase
    .from("organization_members")
    .select(`
      id,
      user_roles!inner(
        is_active,
        expires_at,
        roles!inner(
          code,
          is_active,
          role_permissions(
            permissions(code)
          )
        )
      )
    `)
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return { codes: [], roleCodes: [] };
  const codes = new Set<string>();
  const roleCodes = new Set<string>();
  const nowMs = Date.now();
  const userRoles: any[] = (data as any).user_roles ?? [];
  for (const ur of userRoles) {
    if (!ur.is_active) continue;
    if (ur.expires_at && new Date(ur.expires_at).getTime() < nowMs) continue;
    const role = ur.roles;
    if (!role || !role.is_active) continue;
    if (role.code) roleCodes.add(String(role.code).toLowerCase());
    const rps: any[] = role.role_permissions ?? [];
    for (const rp of rps) {
      const code = rp.permissions?.code;
      if (code) codes.add(code);
    }
  }
  return { codes: Array.from(codes), roleCodes: Array.from(roleCodes) };
};

const deriveRoleFromSlugs = (roleCodes: string[], dbCodes: string[]): AppRole => {
  const s = new Set(roleCodes);
  if (s.has("hr") || s.has("hr_admin") || s.has("admin")) return "HR";
  if (s.has("manager") || s.has("rehber")) return "MANAGER";
  if (s.has("user") || s.has("employee")) return "USER";
  return "USER";
};

// ── Resolve a Supabase-authenticated user into an AuthUser (role + perms) ─────
const buildAuthUserFromSupabase = async (
  supabaseUserId: string,
  email: string,
): Promise<AuthUser | null> => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, is_platform_super_admin, must_change_password")
    .eq("id", supabaseUserId)
    .maybeSingle();

  if (!profile) return null;

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim()
    || (profile.email ?? email);
  const avatar = (fullName || email).charAt(0).toUpperCase();

  const organizations = await fetchOrgMemberships(supabaseUserId);
  const currentOrgId = organizations[0]?.organizationId;
  const mustChangePassword = !!(profile as any).must_change_password;

  // Platform super admin — cross-organisation access to admin surfaces.
  if (profile.is_platform_super_admin) {
    return {
      name: fullName,
      email: profile.email ?? email,
      role: "SUPER_ADMIN",
      avatar,
      department: "Platform",
      team: "—",
      permissions: ["admin_users"],
      mustChangePassword,
      supabaseUserId,
      currentOrgId,
      organizations,
    };
  }

  // Regular org member — role + permissions derive strictly from user_roles /
  // role_permissions for the active organisation. Whatever HR toggles in the
  // "Rol və Səlahiyyətlər" surface flows directly to every user of that role.
  let dbCodes: string[] = [];
  let roleCodes: string[] = [];
  if (currentOrgId) {
    const r = await fetchRoleDataForOrg(supabaseUserId, currentOrgId);
    dbCodes = r.codes;
    roleCodes = r.roleCodes;
  }
  const role = deriveRoleFromSlugs(roleCodes, dbCodes);
  // Permissions surface: DB codes + derived UI module keys. No blanket HR
  // override — an HR user with a stripped-down role sees only what's granted.
  const permissions = derivePermissionsFromDbCodes(dbCodes);


  return {
    name: fullName,
    email: profile.email ?? email,
    role,
    avatar,
    department: organizations[0]?.organizationName ?? "—",
    team: "—",
    permissions,
    mustChangePassword,
    supabaseUserId,
    currentOrgId,
    organizations,
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Subscribe first so we never miss an auth event.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Defer supabase calls to avoid deadlocks inside the callback.
        setTimeout(() => {
          buildAuthUserFromSupabase(session.user.id, session.user.email ?? "").then(u => {
            if (u) {
              setUser(u);
              if (u.currentOrgId && u.supabaseUserId) {
                void activateOrgSync(u.currentOrgId, u.supabaseUserId);
                void activateKpiCardsSync(u.currentOrgId);
                void activateApprovalsSync(u.currentOrgId);
                void activatePayrollSync(u.currentOrgId);
                void activateLifecycleSync(u.currentOrgId);
                activateNotificationsSync(u.currentOrgId);
                void activatePhase1Sync(u.currentOrgId);
                void activateTeamsSync(u.currentOrgId);
                if (u.supabaseUserId) void hydrateLanguageFromProfile(u.supabaseUserId);
              }
            }
          });
        }, 0);
      } else {
        deactivateOrgSync();
        deactivateKpiCardsSync();
        deactivateApprovalsSync();
        deactivatePayrollSync();
        deactivateLifecycleSync();
        deactivateNotificationsSync();
        deactivatePhase1Sync();
        deactivateTeamsSync();
        setUser(null);
      }
    });

    // Initial hydration from Supabase session.
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const u = await buildAuthUserFromSupabase(session.user.id, session.user.email ?? "");
        if (u) {
          setUser(u);
          if (u.currentOrgId && u.supabaseUserId) {
            void activateOrgSync(u.currentOrgId, u.supabaseUserId);
            void activateKpiCardsSync(u.currentOrgId);
            void activateApprovalsSync(u.currentOrgId);
            void activatePayrollSync(u.currentOrgId);
            void activateLifecycleSync(u.currentOrgId);
            activateNotificationsSync(u.currentOrgId);
            void activatePhase1Sync(u.currentOrgId);
            void activateTeamsSync(u.currentOrgId);
            if (u.supabaseUserId) void hydrateLanguageFromProfile(u.supabaseUserId);
          }
        }
      }
      setLoading(false);
    })();

    return () => subscription.subscription.unsubscribe();
  }, []);

  // Realtime: when roles / role_permissions / user_roles change anywhere in
  // the org, re-derive the current user's permissions so the UI updates
  // without requiring a re-login.
  useEffect(() => {
    if (!user?.supabaseUserId) return;
    const uid = user.supabaseUserId;
    const email = user.email;

    let scheduled: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (scheduled) return;
      scheduled = setTimeout(async () => {
        scheduled = null;
        const fresh = await buildAuthUserFromSupabase(uid, email);
        if (fresh) setUser(fresh);
      }, 250);
    };

    const channel = supabase
      .channel(`rbac-live-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "role_permissions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "roles" }, refresh)
      .subscribe();

    // Fallback: refresh on tab focus, on pointer/keyboard activity, and every 3s
    // so permission edits reach the user quickly even when RLS hides realtime
    // broadcasts from their session.
    const onFocus = () => refresh();
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(refresh, 3000);

    return () => {
      if (scheduled) clearTimeout(scheduled);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user?.supabaseUserId, user?.email]);





  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const lower = email.toLowerCase().trim();

    // 1) Try real Supabase auth first.
    const { data, error } = await supabase.auth.signInWithPassword({
      email: lower,
      password,
    });
    if (!error && data?.user) {
      const u = await buildAuthUserFromSupabase(data.user.id, data.user.email ?? lower);
      if (u) {
        setUser(u);
        if (u.currentOrgId && u.supabaseUserId) {
          void activateOrgSync(u.currentOrgId, u.supabaseUserId);
                void activateKpiCardsSync(u.currentOrgId);
                void activateApprovalsSync(u.currentOrgId);
                void activatePayrollSync(u.currentOrgId);
                void activateLifecycleSync(u.currentOrgId);
                activateNotificationsSync(u.currentOrgId);
                void activatePhase1Sync(u.currentOrgId);
                if (u.supabaseUserId) void hydrateLanguageFromProfile(u.supabaseUserId);
        }
        void logAudit({ organizationId: u.currentOrgId ?? null, action: "login", module: "auth", entityType: "user", entityId: u.supabaseUserId ?? null, metadata: { method: "password", email: lower } });
        return { success: true };
      }
      // Fell through — no profile row. Sign out.
      await supabase.auth.signOut();
      return { success: false, error: "Profil tapılmadı" };
    }

    return { success: false, error: error?.message ?? "Email və ya şifrə yanlışdır" };
  };


  const logout = async () => {
    void logAudit({ organizationId: user?.currentOrgId ?? null, action: "logout", module: "auth", entityType: "user", entityId: user?.supabaseUserId ?? null });
    setUser(null);
    deactivateOrgSync();
    deactivateKpiCardsSync();
    deactivateApprovalsSync();
    deactivatePayrollSync();
    deactivateLifecycleSync();
    deactivateNotificationsSync();
    deactivatePhase1Sync();
    await supabase.auth.signOut();
  };

  const hasPermission = (perm: string) => {
    if (!user) return false;
    return user.permissions.includes(perm);
  };

  const changePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Sessiya tapılmadı" };
    const value = newPassword.trim();
    if (value.length < 8) return { success: false, error: "Şifrə ən az 8 simvol olmalıdır" };

    if (!user.supabaseUserId) {
      return { success: false, error: "Yalnız Supabase istifadəçiləri şifrəni dəyişə bilər" };
    }
    const { error } = await supabase.auth.updateUser({ password: value });
    if (error) return { success: false, error: error.message };
    await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.supabaseUserId);
    setUser({ ...user, mustChangePassword: false });
    return { success: true };
  };


  const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, changePassword, sendPasswordReset }}>
      {children}
    </AuthContext.Provider>
  );
};

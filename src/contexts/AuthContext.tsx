import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_MODULE_KEYS } from "@/lib/modulePermissions";
import {
  derivePermissionsFromDbCodes,
  deriveRoleFromDbCodes,
  HR_FULL_UI_PERMISSIONS,
  type AppRole,
} from "@/lib/permissionMapping";
import { activateOrgSync, deactivateOrgSync } from "@/lib/orgService";
import { activateKpiCardsSync, deactivateKpiCardsSync } from "@/lib/kpiCardsService";
import { activateApprovalsSync, deactivateApprovalsSync } from "@/lib/approvalsService";
import { activatePayrollSync, deactivatePayrollSync } from "@/lib/payrollService";
import { activateLifecycleSync, deactivateLifecycleSync } from "@/lib/lifecycleService";
import { activateNotificationsSync, deactivateNotificationsSync } from "@/lib/notificationsService";
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

// ── Fetch the DB permission codes granted to a user within a given org. ───────
const fetchPermissionCodesForOrg = async (
  userId: string,
  orgId: string,
): Promise<string[]> => {
  const { data } = await supabase
    .from("organization_members")
    .select(`
      id,
      user_roles!inner(
        is_active,
        expires_at,
        roles!inner(
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

  if (!data) return [];
  const codes = new Set<string>();
  const nowMs = Date.now();
  const userRoles: any[] = (data as any).user_roles ?? [];
  for (const ur of userRoles) {
    if (!ur.is_active) continue;
    if (ur.expires_at && new Date(ur.expires_at).getTime() < nowMs) continue;
    const role = ur.roles;
    if (!role || !role.is_active) continue;
    const rps: any[] = role.role_permissions ?? [];
    for (const rp of rps) {
      const code = rp.permissions?.code;
      if (code) codes.add(code);
    }
  }
  return Array.from(codes);
};

// ── Resolve a Supabase-authenticated user into an AuthUser (role + perms) ─────
const buildAuthUserFromSupabase = async (
  supabaseUserId: string,
  email: string,
): Promise<AuthUser | null> => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, is_platform_super_admin")
    .eq("id", supabaseUserId)
    .maybeSingle();

  if (!profile) return null;

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim()
    || (profile.email ?? email);
  const avatar = (fullName || email).charAt(0).toUpperCase();

  const organizations = await fetchOrgMemberships(supabaseUserId);
  const currentOrgId = organizations[0]?.organizationId;

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
      supabaseUserId,
      currentOrgId,
      organizations,
    };
  }

  // Regular org member — resolve role + permissions from user_roles for the
  // active organisation. Users with no org membership get a minimal profile.
  let dbCodes: string[] = [];
  if (currentOrgId) {
    dbCodes = await fetchPermissionCodesForOrg(supabaseUserId, currentOrgId);
  }
  const role = deriveRoleFromDbCodes(dbCodes, false);
  // HR always gets the full UI module surface; others rely on the derived map.
  const permissions = role === "HR"
    ? Array.from(new Set([...dbCodes, ...HR_FULL_UI_PERMISSIONS]))
    : derivePermissionsFromDbCodes(dbCodes);

  return {
    name: fullName,
    email: profile.email ?? email,
    role,
    avatar,
    department: organizations[0]?.organizationName ?? "—",
    team: "—",
    permissions,
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
            if (u.supabaseUserId) void hydrateLanguageFromProfile(u.supabaseUserId);
          }
        }
      }
      setLoading(false);
    })();

    return () => subscription.subscription.unsubscribe();
  }, []);


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
    localStorage.removeItem(SESSION_KEY);
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

    // Real Supabase user — update via auth API.
    if (user.supabaseUserId) {
      const { error } = await supabase.auth.updateUser({ password: value });
      if (error) return { success: false, error: error.message };
      setUser({ ...user, mustChangePassword: false });
      return { success: true };
    }

    // Demo fallback.
    setPasswordForEmail(user.email, value);
    const hr = findHrAdminByEmail(user.email);
    if (hr) setHrAdminMustChangePassword(hr.id, false);
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

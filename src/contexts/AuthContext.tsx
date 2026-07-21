import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPasswordForEmail, setPasswordForEmail, verifyDemoPassword } from "@/lib/passwordStore";
import {
  findHrAdminByEmail,
  setHrAdminLastLoginNow,
  setHrAdminMustChangePassword,
} from "@/lib/hrAdminStore";
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

// Legacy demo super admin email (kept for backwards compatibility with prototype data)
const SUPER_ADMIN_EMAIL = "superadmin@kpi.az";

// Demo account profiles — used as a fallback when Supabase auth doesn't
// recognise the account. The real production accounts live in Supabase.
const demoProfiles: { email: string; user: AuthUser }[] = [
  {
    email: SUPER_ADMIN_EMAIL,
    user: {
      name: "Super Admin",
      email: SUPER_ADMIN_EMAIL,
      role: "SUPER_ADMIN",
      avatar: "SA",
      department: "Sistem",
      team: "—",
      permissions: ["admin_users"],
    },
  },
  {
    email: "hr@kpi.az",
    user: {
      name: "Günel Əlizadə",
      email: "hr@kpi.az",
      role: "HR",
      avatar: "G",
      department: "HR",
      team: "HR Komandası",
      permissions: [...ALL_MODULE_KEYS, "kpi_own", "kpi_team", "teams_compare", "teams_all"],
    },
  },
  {
    email: "user@kpi.az",
    user: {
      name: "Samir Həsənov",
      email: "user@kpi.az",
      role: "USER",
      avatar: "S",
      department: "Satış Departamenti",
      team: "Elite Satış Komandası",
      permissions: ["home", "kpi_own", "kpi_team", "approvals", "reporting", "teams", "teams_compare"],
    },
  },
  {
    email: "manager@kpi.az",
    user: {
      name: "Elvin Rəhimov",
      email: "manager@kpi.az",
      role: "MANAGER",
      avatar: "E",
      department: "Satış Departamenti",
      team: "Elite Satış Komandası",
      permissions: [
        "home", "approvals", "kpi_own", "kpi_team", "teams", "teams_compare",
        "goal_tracking", "kpi_scores", "bonus", "reporting", "whistleblower", "settings",
      ],
    },
  },
  {
    email: "kamran@kpi.az",
    user: {
      name: "Kamran Quliyev",
      email: "kamran@kpi.az",
      role: "MANAGER",
      avatar: "K",
      department: "Marketinq Departamenti › Rəqəmsal Marketinq Şöbəsi",
      team: "Rəqəmsal Marketinq Şöbəsi",
      permissions: [
        "home", "approvals", "kpi_own", "kpi_team", "teams", "teams_compare",
        "goal_tracking", "kpi_scores", "bonus", "reporting", "whistleblower", "settings",
      ],
    },
  },
];

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

// ── Demo/prototype session signing (still used for demo profile fallback) ──────
const SESSION_KEY = "kpi_auth_v2";
const SESSION_SECRET_KEY = "kpi_session_secret";
const SUPERADMIN_SEED_FLAG = "kpi_superadmin_seeded_v2";

const getSessionSecret = (): string => {
  let s = localStorage.getItem(SESSION_SECRET_KEY);
  if (!s) {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    s = Array.from(arr, b => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(SESSION_SECRET_KEY, s);
  }
  return s;
};

const sign = async (payload: string): Promise<string> => {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, "0")).join("");
};

interface SignedSession { payload: string; sig: string; }

const resolveDemoUser = (email: string): AuthUser | null => {
  const lower = email.toLowerCase();
  const profile = demoProfiles.find(p => p.email.toLowerCase() === lower);
  if (profile) return profile.user;
  const hr = findHrAdminByEmail(lower);
  if (hr && hr.active) {
    return {
      name: hr.name,
      email: hr.email,
      role: "HR",
      avatar: hr.name.charAt(0).toUpperCase(),
      department: "HR",
      team: "HR Komandası",
      permissions: hr.permissions,
      mustChangePassword: !!hr.mustChangePassword,
    };
  }
  return null;
};

const loadDemoSession = async (): Promise<AuthUser | null> => {
  localStorage.removeItem("kpi_auth");
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const { payload, sig } = JSON.parse(raw) as SignedSession;
    const expected = await sign(payload);
    if (expected !== sig) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    const parsed = JSON.parse(payload) as { email: string };
    const user = resolveDemoUser(parsed.email);
    if (!user) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return user;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

const saveDemoSession = async (user: AuthUser) => {
  const payload = JSON.stringify({ email: user.email, ts: Date.now() });
  const sig = await sign(payload);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ payload, sig }));
};

const seedSuperAdminPassword = () => {
  if (localStorage.getItem(SUPERADMIN_SEED_FLAG)) return;
  try {
    const raw = localStorage.getItem("kpi_user_passwords");
    if (raw) {
      const custom = JSON.parse(raw) as Record<string, string>;
      delete custom[SUPER_ADMIN_EMAIL];
      delete custom["hr@kpi.az"];
      delete custom["user@kpi.az"];
      localStorage.setItem("kpi_user_passwords", JSON.stringify(custom));
    }
  } catch {}
  localStorage.setItem(SUPERADMIN_SEED_FLAG, "1");
};

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
    seedSuperAdminPassword();

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
        // Only clear if there is no active demo session.
        loadDemoSession().then(demo => {
          if (!demo) setUser(null);
        });
      }
    });

    // Initial hydration: prefer Supabase session, fall back to demo session.
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
      } else {
        const demo = await loadDemoSession();
        if (demo) setUser(demo);
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
      // Fell through — no profile row. Sign out and try demo fallback.
      await supabase.auth.signOut();
    }

    // 2) Legacy demo fallback (prototype accounts).
    const resolved = resolveDemoUser(lower);
    if (resolved) {
      const customPassword = getPasswordForEmail(lower);
      const ok = customPassword
        ? customPassword === password
        : await verifyDemoPassword(lower, password);
      if (ok) {
        const hr = findHrAdminByEmail(lower);
        if (hr) setHrAdminLastLoginNow(hr.id);
        setUser(resolved);
        await saveDemoSession(resolved);
        return { success: true };
      }
    }

    return { success: false, error: "Email və ya şifrə yanlışdır" };
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

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getPasswordForEmail, setPasswordForEmail, verifyDemoPassword } from "@/lib/passwordStore";
import {
  findHrAdminByEmail,
  setHrAdminLastLoginNow,
  setHrAdminMustChangePassword,
} from "@/lib/hrAdminStore";
import { ALL_MODULE_KEYS } from "@/lib/modulePermissions";

export interface AuthUser {
  name: string;
  email: string;
  role: "HR" | "USER" | "SUPER_ADMIN" | "MANAGER";
  avatar: string;
  department: string;
  team: string;
  permissions: string[];
  mustChangePassword?: boolean;
}

// Super Admin — yalnız HR (Admin) hesablarını idarə edir, başqa heç bir modula girişi yoxdur.
const SUPER_ADMIN_EMAIL = "superadmin@kpi.az";

// Demo account profiles (NO passwords stored client-side).
// Passwords are verified via hashed comparison in passwordStore.
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
      // Yalnız öz idarəetmə ekranı — heç bir əməliyyat modulu yoxdur.
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
      // Default HR — bütün modullara giriş
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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ success: false }),
  logout: () => {},
  hasPermission: () => false,
  changePassword: async () => ({ success: false }),
});

export const useAuth = () => useContext(AuthContext);

// Session integrity: derive a per-browser secret and sign the auth payload so
// users cannot grant themselves elevated roles by editing localStorage directly.
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

// HR Admin (Super Admin tərəfindən yaradılan) hesablarını AuthUser-ə çevir.
const resolveUser = (email: string): AuthUser | null => {
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

const loadSession = async (): Promise<AuthUser | null> => {
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
    const user = resolveUser(parsed.email);
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

const saveSession = async (user: AuthUser) => {
  const payload = JSON.stringify({ email: user.email, ts: Date.now() });
  const sig = await sign(payload);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ payload, sig }));
};

// İlk dəfə açılışda köhnə demo şifrəni təmizlə ki, defaultPasswordHashes üzərindən
// yeni güclü şifrələrlə giriş işləsin.
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    seedSuperAdminPassword();
    loadSession().then(setUser);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const lower = email.toLowerCase();
    const resolved = resolveUser(lower);
    if (!resolved) {
      return { success: false, error: "Email və ya şifrə yanlışdır" };
    }
    const customPassword = getPasswordForEmail(lower);
    const ok = customPassword
      ? customPassword === password
      : await verifyDemoPassword(lower, password);
    if (!ok) {
      return { success: false, error: "Email və ya şifrə yanlışdır" };
    }
    // Track first-login timestamp for HR admin accounts (used to gate
    // company deletion when data may already have been created).
    const hr = findHrAdminByEmail(lower);
    if (hr) setHrAdminLastLoginNow(hr.id);
    setUser(resolved);
    await saveSession(resolved);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const hasPermission = (perm: string) => {
    if (!user) return false;
    return user.permissions.includes(perm);
  };

  const changePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Sessiya tapılmadı" };
    const value = newPassword.trim();
    if (value.length < 8) return { success: false, error: "Şifrə ən az 8 simvol olmalıdır" };
    setPasswordForEmail(user.email, value);
    const hr = findHrAdminByEmail(user.email);
    if (hr) setHrAdminMustChangePassword(hr.id, false);
    setUser({ ...user, mustChangePassword: false });
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, hasPermission, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

// Legacy demo password/OTP store.
//
// Real authentication now runs through Supabase (AuthContext). This module
// used to persist demo passwords and one-time codes in localStorage, which is
// a security anti-pattern and no longer needed. It now exposes no-op shims so
// existing call sites (HR admin creation, invitation flows) keep compiling
// without ever writing plaintext credentials to the browser.
//
// Managed-user metadata (name, email, department, role) still lives in
// localStorage for a handful of screens that show a demo directory. That
// portion is harmless and remains for backwards compatibility.

export interface ManagedUser {
  id: number;
  fin: string;
  name: string;
  email: string;
  department: string;
  role: "HR" | "USER";
}

const STORAGE_USERS = "kpi_managed_users";

const initialUsers: ManagedUser[] = [];

export const getUsers = (): ManagedUser[] => {
  const saved = localStorage.getItem(STORAGE_USERS);
  if (saved) {
    try { return JSON.parse(saved); } catch { /* noop */ }
  }
  localStorage.setItem(STORAGE_USERS, JSON.stringify(initialUsers));
  return initialUsers;
};

export const updateUser = (id: number, patch: Partial<ManagedUser>) => {
  const users = getUsers().map(u => u.id === id ? { ...u, ...patch } : u);
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  return users;
};

// ── Deprecated no-ops ──────────────────────────────────────────────────────
// Real credentials are managed by Supabase Auth. These stubs exist only so
// legacy call sites keep type-checking; they do not persist anything.

export const verifyDemoPassword = async (_email: string, _password: string): Promise<boolean> => false;
export const getPasswordForEmail = (_email: string): string | null => null;
export const setPasswordForEmail = (_email: string, _password: string): void => { /* noop — use Supabase Auth */ };
export const generateOtp = (_email: string): string => "";
export const getActiveOtp = (_email: string): string | null => null;
export const verifyOtp = (_email: string, _code: string): boolean => false;
export const consumeOtp = (_email: string): void => { /* noop */ };

// Super Admin tərəfindən yaradılan HR (Admin) hesabları.
// localStorage-də saxlanılır. Şifrələr ayrıca passwordStore.setPasswordForEmail-də saxlanır.

import { useEffect, useState } from "react";
import { setPasswordForEmail } from "@/lib/passwordStore";

export interface HrAdminAccount {
  id: string;
  name: string;
  email: string;
  permissions: string[];
  createdAt: number;
  active: boolean;
  mustChangePassword?: boolean;
  lastLoginAt?: number;
}

const KEY = "kpi_hr_admin_accounts_v1";
const EVT = "hr-admins-updated";

const load = (): HrAdminAccount[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const persist = (list: HrAdminAccount[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
};

export const getHrAdmins = (): HrAdminAccount[] => load();

export const findHrAdminByEmail = (email: string): HrAdminAccount | null => {
  const e = email.toLowerCase().trim();
  return load().find(a => a.email.toLowerCase() === e) || null;
};

export const createHrAdmin = (
  name: string,
  email: string,
  password: string,
  permissions: string[],
): { ok: boolean; error?: string; account?: HrAdminAccount } => {
  const n = name.trim();
  const e = email.trim().toLowerCase();
  const p = password.trim();
  if (!n || !e || !p) return { ok: false, error: "Bütün sahələri doldurun" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, error: "E-poçt formatı yanlışdır" };
  if (p.length < 6) return { ok: false, error: "Şifrə ən az 6 simvol olmalıdır" };
  const list = load();
  if (list.some(a => a.email.toLowerCase() === e)) return { ok: false, error: "Bu e-poçt artıq mövcuddur" };
  const account: HrAdminAccount = {
    id: crypto.randomUUID(),
    name: n,
    email: e,
    permissions: [...permissions],
    createdAt: Date.now(),
    active: true,
    mustChangePassword: true,
  };
  persist([...list, account]);
  setPasswordForEmail(e, p);
  return { ok: true, account };
};

export const setHrAdminMustChangePassword = (id: string, value: boolean) =>
  updateHrAdmin(id, { mustChangePassword: value });

export const setHrAdminLastLoginNow = (id: string) =>
  updateHrAdmin(id, { lastLoginAt: Date.now() });

export const updateHrAdmin = (id: string, patch: Partial<Omit<HrAdminAccount, "id" | "createdAt">>) => {
  persist(load().map(a => a.id === id ? { ...a, ...patch } : a));
};

export const setHrAdminPermissions = (id: string, permissions: string[]) => {
  updateHrAdmin(id, { permissions: [...permissions] });
};

export const toggleHrAdminPermission = (id: string, perm: string) => {
  const list = load();
  const acc = list.find(a => a.id === id);
  if (!acc) return;
  const has = acc.permissions.includes(perm);
  const next = has ? acc.permissions.filter(p => p !== perm) : [...acc.permissions, perm];
  updateHrAdmin(id, { permissions: next });
};

export const setHrAdminActive = (id: string, active: boolean) => updateHrAdmin(id, { active });

export const deleteHrAdmin = (id: string) => {
  persist(load().filter(a => a.id !== id));
};

export const useHrAdmins = (): HrAdminAccount[] => {
  const [list, setList] = useState<HrAdminAccount[]>(() => load());
  useEffect(() => {
    const refresh = () => setList(load());
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return list;
};

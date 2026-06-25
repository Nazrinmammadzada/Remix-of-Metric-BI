// Roles store — shared between Settings (Rol və Səlahiyyət) and other modules
// (Bildiriş sazlamaları → Alıcılar etc.)
import { useEffect, useState } from "react";

export interface RoleEntry {
  id: number;
  name: string;
  permissions: Record<string, string[]>;
  users: string[];
  description?: string;
  language?: "AZ" | "EN" | "RU";
}

const KEY = "kpi_roles_v1";
const EVT = "kpi-roles-updated";

const SEED: RoleEntry[] = [
  {
    id: 1, name: "USER", description: "Standart istifadəçi",
    permissions: {
      home: ["view"], kpi: ["view_own", "view_team"], approvals: ["view", "comment"],
      reporting: ["view_own", "view_team"], teams: ["view_own", "view_compare"],
      evaluation: ["view"], whistleblower: ["view", "submit"],
    },
    users: ["Samir Həsənov", "Leyla Məmmədova", "Rəşad Əliyev", "Farid Həsənov", "Emin Məmmədov"],
  },
  {
    id: 2, name: "HR", description: "İnsan resursları admin", permissions: {}, users: ["Günel Əlizadə", "Nigar Hüseynova"],
  },
];

export const loadRoles = (): RoleEntry[] | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

export const getRoles = (): RoleEntry[] => loadRoles() ?? SEED;

export const saveRoles = (roles: RoleEntry[]) => {
  localStorage.setItem(KEY, JSON.stringify(roles));
  window.dispatchEvent(new Event(EVT));
};

export const useRoles = (): RoleEntry[] => {
  const [list, setList] = useState<RoleEntry[]>(() => getRoles());
  useEffect(() => {
    const r = () => setList(getRoles());
    window.addEventListener(EVT, r);
    window.addEventListener("storage", r);
    return () => {
      window.removeEventListener(EVT, r);
      window.removeEventListener("storage", r);
    };
  }, []);
  return list;
};

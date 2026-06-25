// Demo password & OTP store (localStorage-based)
// Simulates a real password reset system without a backend

export interface ManagedUser {
  id: number;
  fin: string;
  name: string;
  email: string;
  department: string;
  role: "HR" | "USER";
}

const STORAGE_USERS = "kpi_managed_users";
const STORAGE_PASSWORDS = "kpi_user_passwords";
const STORAGE_OTPS = "kpi_user_otps";

// Initial demo users (FIN, name, email)
const initialUsers: ManagedUser[] = [
  { id: 1, fin: "1A2B3C4", name: "Günel Əlizadə", email: "hr@kpi.az", department: "HR", role: "HR" },
  { id: 2, fin: "2B3C4D5", name: "Nigar Hüseynova", email: "nigar@kpi.az", department: "HR", role: "HR" },
  { id: 3, fin: "3C4D5E6", name: "Samir Həsənov", email: "user@kpi.az", department: "Satış Departamenti", role: "USER" },
  { id: 4, fin: "4D5E6F7", name: "Leyla Məmmədova", email: "leyla@kpi.az", department: "Satış Departamenti", role: "USER" },
  { id: 5, fin: "5E6F7G8", name: "Rəşad Əliyev", email: "reshad@kpi.az", department: "R&D", role: "USER" },
  { id: 6, fin: "6F7G8H9", name: "Farid Həsənov", email: "farid@kpi.az", department: "Regional", role: "USER" },
  { id: 7, fin: "7G8H9I0", name: "Emin Məmmədov", email: "emin@kpi.az", department: "Marketinq", role: "USER" },
  { id: 8, fin: "8H9I0J1", name: "Kamran Quliyev", email: "kamran@kpi.az", department: "Əməliyyat", role: "USER" },
  { id: 9, fin: "9I0J1K2", name: "Aysel Quliyeva", email: "aysel@kpi.az", department: "Satış Departamenti", role: "USER" },
  { id: 10, fin: "0J1K2L3", name: "Tural İsmayılov", email: "tural@kpi.az", department: "Analitika", role: "USER" },
];

// Default demo credentials are NOT stored in plaintext in the bundle.
// We ship only SHA-256 hashes of demo passwords; demo testers receive the
// plaintext out-of-band. (Still demo-grade — production must use real auth.)
const defaultPasswordHashes: Record<string, string> = {
  "superadmin@kpi.az": "c54e90fd0cf8ed398ce76cd8bcdbd84b69009260971cf5c148ff7315b00f5b31",
  "hr@kpi.az": "7f8833ee8ea278bb806cc4bd0da1261024f404ffe915c9f627114029391d771a",
  "user@kpi.az": "aabfbefdbecf9b412e81d665e1dadee27ed73d6978237f2445909d5975a20dab",
  "manager@kpi.az": "868e2eb4f23ccfbd2eb180801569b7e1291660f137bcaca405854ff6219247a9",
};

const sha256Hex = async (input: string): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
};

const constantTimeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};

export const verifyDemoPassword = async (email: string, password: string): Promise<boolean> => {
  const expected = defaultPasswordHashes[email.toLowerCase()];
  if (!expected) return false;
  const actual = await sha256Hex(password);
  return constantTimeEqual(actual, expected);
};

export const getUsers = (): ManagedUser[] => {
  const saved = localStorage.getItem(STORAGE_USERS);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  localStorage.setItem(STORAGE_USERS, JSON.stringify(initialUsers));
  return initialUsers;
};

export const updateUser = (id: number, patch: Partial<ManagedUser>) => {
  const users = getUsers().map(u => u.id === id ? { ...u, ...patch } : u);
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
  return users;
};

const getPasswords = (): Record<string, string> => {
  const saved = localStorage.getItem(STORAGE_PASSWORDS);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return {};
};

export const getPasswordForEmail = (email: string): string | null => {
  const passwords = getPasswords();
  return passwords[email.toLowerCase()] || null;
};

export const setPasswordForEmail = (email: string, password: string) => {
  const stored = localStorage.getItem(STORAGE_PASSWORDS);
  let custom: Record<string, string> = {};
  if (stored) { try { custom = JSON.parse(stored); } catch {} }
  custom[email.toLowerCase()] = password;
  localStorage.setItem(STORAGE_PASSWORDS, JSON.stringify(custom));
};

interface OTPRecord { code: string; createdAt: number; }

const getOtps = (): Record<string, OTPRecord> => {
  const saved = localStorage.getItem(STORAGE_OTPS);
  if (saved) { try { return JSON.parse(saved); } catch {} }
  return {};
};

export const generateOtp = (email: string): string => {
  // 6-digit one-time code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const otps = getOtps();
  otps[email.toLowerCase()] = { code, createdAt: Date.now() };
  localStorage.setItem(STORAGE_OTPS, JSON.stringify(otps));
  return code;
};

export const getActiveOtp = (email: string): string | null => {
  const otp = getOtps()[email.toLowerCase()];
  if (!otp) return null;
  // Valid for 24 hours in this demo
  if (Date.now() - otp.createdAt > 24 * 60 * 60 * 1000) return null;
  return otp.code;
};

export const verifyOtp = (email: string, code: string): boolean => {
  const active = getActiveOtp(email);
  return active !== null && active === code.trim();
};

export const consumeOtp = (email: string) => {
  const otps = getOtps();
  delete otps[email.toLowerCase()];
  localStorage.setItem(STORAGE_OTPS, JSON.stringify(otps));
};

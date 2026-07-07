// One-shot dev/browser reset: silir bütün istifadəçi tərəfindən yaradılmış
// localStorage məlumatlarını, amma login sessiyasını və default seed-i saxlayır.
// Bundan sonrakı yüklənişlərdə hər store öz default (seed) verilənlərini
// bərpa edir.

const RESET_FLAG = "kpi_dev_reset_v5_2026_07_08";

const PRESERVE = new Set<string>([
  "kpi_auth_v2",
  "kpi_session_secret",
  "kpi_superadmin_seeded_v2",
  "kpi_user_passwords",
  RESET_FLAG,
]);

export const runDevResetOnce = (): void => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    if (localStorage.getItem(RESET_FLAG)) return;
    const keys = Object.keys(localStorage);
    keys.forEach((k) => {
      if (!PRESERVE.has(k)) {
        try { localStorage.removeItem(k); } catch {}
      }
    });
    localStorage.setItem(RESET_FLAG, String(Date.now()));
  } catch {}
};

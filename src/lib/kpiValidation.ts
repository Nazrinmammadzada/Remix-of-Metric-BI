// Type-based KPI target validation helpers.
// Used in both HR and USER KPI creation forms.

export type KpiTypeKey =
  | "Faiz Hədəfi"
  | "Absolut Hədəf"
  | "Say Hədəfi"
  | "Trend Hədəfi"
  | "Benchmark";

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export const getTargetPlaceholder = (types: string[]): string => {
  if (types.some(t => t.includes("Faiz"))) return "Məs: 95";
  if (types.some(t => t.includes("Absolut"))) return "Məs: 5000000";
  if (types.some(t => t.includes("Say"))) return "Məs: 500";
  if (types.some(t => t.includes("Benchmark"))) return "Məs: 80";
  if (types.some(t => t.includes("Trend"))) return "Məs: +12";
  return "Hədəf dəyəri";
};

/** Seçilmiş KPI tipinə uyğun ümumi hədəfin ölçü vahidi (input içində chip kimi göstərilir). */
export const getTargetUnitSuffix = (types: string[]): string => {
  if (types.some(t => t.includes("Faiz"))) return "%";
  if (types.some(t => t.includes("Absolut"))) return "AZN";
  if (types.some(t => t.includes("Say"))) return "ədəd";
  if (types.some(t => t.includes("Trend"))) return "%";
  if (types.some(t => t.includes("Benchmark"))) return "bal";
  return "";
};

export const validateTarget = (value: string, types: string[]): ValidationResult => {
  const v = value.trim();
  if (!v) return { ok: true }; // empty is allowed at draft level

  // Faiz: must contain % or be 0-100 numeric
  if (types.includes("Faiz Hədəfi")) {
    const num = parseFloat(v.replace("%", "").replace(",", "."));
    if (isNaN(num)) return { ok: false, error: "Faiz formatı: 0-100 və ya 95%" };
    if (num < 0 || num > 100) return { ok: false, error: "Faiz 0-100 aralığında olmalıdır" };
    return { ok: true };
  }

  // Say: positive integer
  if (types.includes("Say Hədəfi")) {
    if (!/^\d+$/.test(v)) return { ok: false, error: "Say tam ədəd olmalıdır (məs: 500)" };
    return { ok: true };
  }

  // Absolut: number with optional unit suffix (AZN, USD, M, K)
  if (types.includes("Absolut Hədəf")) {
    if (!/^[\d.,]+\s*(K|M|MLN|MIN|AZN|USD|EUR)?(\s+(AZN|USD|EUR))?$/i.test(v)) {
      return { ok: false, error: "Absolut format: 5M AZN, 500000, 1.2M" };
    }
    return { ok: true };
  }

  // Trend: signed percent (+12% / -3%)
  if (types.includes("Trend Hədəfi")) {
    if (!/^[+-]?\d+([.,]\d+)?%?$/.test(v)) {
      return { ok: false, error: "Trend format: +12%, -3%" };
    }
    return { ok: true };
  }

  // Benchmark: numeric 0-100 or score
  if (types.includes("Benchmark")) {
    const num = parseFloat(v.replace(",", "."));
    if (isNaN(num)) return { ok: false, error: "Benchmark rəqəm olmalıdır" };
    return { ok: true };
  }

  return { ok: true };
};

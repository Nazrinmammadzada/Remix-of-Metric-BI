import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * KPI kart adlandırma standartı: bütün KPI kartlarının adları sonda "Kartı" ilə bitməlidir.
 * Əgər ad artıq "kart" / "kartı" ilə bitirsə, olduğu kimi qaytarır.
 */
export function withKartSuffix(name?: string | null): string {
  const s = (name ?? "").trim();
  if (!s) return "";
  if (/\bkart[ıi]?\s*$/i.test(s)) return s;
  return `${s} Kartı`;
}

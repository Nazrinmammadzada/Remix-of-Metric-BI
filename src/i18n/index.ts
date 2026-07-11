import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import az from "./locales/az";
import en from "./locales/en";
import ru from "./locales/ru";

export const SUPPORTED_LANGS = ["az", "en", "ru"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

// UI label ↔ i18n code mapping (Header UI shows AZ/ENG/RU).
export const UI_TO_CODE: Record<"AZ" | "ENG" | "RU", SupportedLang> = {
  AZ: "az",
  ENG: "en",
  RU: "ru",
};
export const CODE_TO_UI: Record<SupportedLang, "AZ" | "ENG" | "RU"> = {
  az: "AZ",
  en: "ENG",
  ru: "RU",
};

// Migrate legacy "kpi_lang" (AZ/ENG/RU) → new "i18nextLng" (az/en/ru).
try {
  const legacy = localStorage.getItem("kpi_lang");
  if (legacy && !localStorage.getItem("i18nextLng")) {
    const code = UI_TO_CODE[legacy as "AZ" | "ENG" | "RU"] ?? "az";
    localStorage.setItem("i18nextLng", code);
  }
} catch {
  /* ignore */
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      az: { translation: az },
      en: { translation: en },
      ru: { translation: ru },
    },
    fallbackLng: "az",
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    returnNull: false,
  });

export default i18n;

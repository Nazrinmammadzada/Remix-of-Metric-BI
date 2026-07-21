// Persists the current user's preferred language on their profile and hydrates
// i18n from that value on login. Keeps localStorage as the fast client cache.
import i18n, { SUPPORTED_LANGS, type SupportedLang } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";

const isSupported = (v: string | null | undefined): v is SupportedLang =>
  !!v && (SUPPORTED_LANGS as readonly string[]).includes(v);

export const hydrateLanguageFromProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return;
  if (isSupported(data.preferred_language) && data.preferred_language !== i18n.language) {
    await i18n.changeLanguage(data.preferred_language);
  }
};

export const persistLanguage = async (lang: SupportedLang) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ preferred_language: lang }).eq("id", user.id);
};

// Auto-persist whenever i18n language changes for a signed-in user.
i18n.on("languageChanged", (lng: string) => {
  const short = lng?.split("-")[0];
  if (isSupported(short)) { void persistLanguage(short); }
});

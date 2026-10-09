import type { Language } from "@/types/language";
import { SUPPORTED_LOCALES } from "@/lib/locale/config";

// SUPPORTED_LOCALES (i18n/request.ts) is the actual source of truth for
// which locales the app supports -- this array only adds display
// metadata for each one already listed there. Adding a locale means
// updating both files; TypeScript now enforces that Language.id can
// only ever be one of SUPPORTED_LOCALES, so they can't silently drift.
export const LANGUAGES: readonly Language[] = [
  { id: "en", name: "English", dir: "ltr" },
  { id: "ar", name: "العربية", dir: "rtl" },
] as const satisfies readonly Language[];

// Sanity check, not runtime-enforced -- if this ever throws, LANGUAGES
// and SUPPORTED_LOCALES have gone out of sync.
if (LANGUAGES.length !== SUPPORTED_LOCALES.length) {
  throw new Error("lib/locale/languages.ts is out of sync with i18n/request.ts's SUPPORTED_LOCALES");
}
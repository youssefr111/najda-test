import { SUPPORTED_LOCALES, type Locale } from "./config";

export type Language = {
  id: Locale;
  name: string;
  dir: "ltr" | "rtl";
};

// SUPPORTED_LOCALES (config.ts) is the actual source of truth for which
// locales the app supports -- this array only adds display metadata for
// each one already listed there. Adding a locale means updating both
// this file and config.ts; the `satisfies` below keeps them from
// silently drifting apart the same way the web app's does.
export const LANGUAGES: readonly Language[] = [
  { id: "en", name: "English", dir: "ltr" },
  { id: "ar", name: "العربية", dir: "rtl" },
] as const satisfies readonly Language[];

if (LANGUAGES.length !== SUPPORTED_LOCALES.length) {
  throw new Error("lib/locale/languages.ts is out of sync with config.ts's SUPPORTED_LOCALES");
}

export function isRtl(locale: Locale): boolean {
  return LANGUAGES.find((l) => l.id === locale)?.dir === "rtl";
}

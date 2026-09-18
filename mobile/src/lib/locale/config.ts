// Mirrors the web app's lib/locale/config.ts one-for-one -- same source of
// truth shape, so adding a language later means touching the same two
// files on both surfaces.
export const DEFAULT_LOCALE: Locale = "en";

export const SUPPORTED_LOCALES = ["en", "ar"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_STORAGE_KEY = "najda-locale";

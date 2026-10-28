export const DEFAULT_LOCALE: Locale = "en";

export const SUPPORTED_LOCALES = ["en", "ar"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_COOKIE = "NAJDA_LOCALE";
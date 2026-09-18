import * as Localization from "expo-localization";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ar from "./locales/ar.json";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from "@/lib/locale/config";

export type { Locale };
export { SUPPORTED_LOCALES };

function deviceLocale(): Locale {
  const tag = Localization.getLocales()[0]?.languageCode;
  return (SUPPORTED_LOCALES as readonly string[]).includes(tag ?? "") ? (tag as Locale) : DEFAULT_LOCALE;
}

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: deviceLocale(),
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18next;

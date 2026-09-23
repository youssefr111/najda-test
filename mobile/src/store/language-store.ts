import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import i18next from "@/i18n";
import { LOCALE_STORAGE_KEY, type Locale } from "@/lib/locale/config";

interface LanguageState {
  locale: Locale;
  ready: boolean;
  /** Reads the saved locale (or falls back to the device's) and applies it. Call once at boot. */
  bootstrap: () => Promise<void>;
  /** Switches language at runtime -- instant, no reload. The app's overall layout direction stays LTR always (see src/components/ui/Directional.tsx for scoping RTL to specific content instead). */
  setLocale: (locale: Locale) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  locale: "en",
  ready: false,

  bootstrap: async () => {
    const saved = (await AsyncStorage.getItem(LOCALE_STORAGE_KEY)) as Locale | null;
    const locale = saved ?? (i18next.language as Locale);
    await i18next.changeLanguage(locale);
    set({ locale, ready: true });
  },

  setLocale: async (locale) => {
    if (locale === get().locale) return;
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
    await i18next.changeLanguage(locale);
    set({ locale });
  },
}));

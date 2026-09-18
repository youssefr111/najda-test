import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nManager } from "react-native";
import * as Updates from "expo-updates";
import { create } from "zustand";
import i18next from "@/i18n";
import { LOCALE_STORAGE_KEY, type Locale } from "@/lib/locale/config";
import { isRtl } from "@/lib/locale/languages";

interface LanguageState {
  locale: Locale;
  ready: boolean;
  /** Reads the saved locale (or falls back to the device's), applies it, and marks the store ready. Call once at boot. */
  bootstrap: () => Promise<void>;
  /** Switches language at runtime. Arabic/English also flips layout direction, which React Native can only apply after a reload. */
  setLocale: (locale: Locale) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  locale: "en",
  ready: false,

  bootstrap: async () => {
    const saved = (await AsyncStorage.getItem(LOCALE_STORAGE_KEY)) as Locale | null;
    const locale = saved ?? (i18next.language as Locale);
    await i18next.changeLanguage(locale);

    const shouldBeRtl = isRtl(locale);
    if (I18nManager.isRTL !== shouldBeRtl) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(shouldBeRtl);
      // The native layout direction only takes effect after a reload --
      // fine on cold boot (nothing has rendered with the wrong
      // direction yet), which is the only place bootstrap() runs.
    }

    set({ locale, ready: true });
  },

  setLocale: async (locale) => {
    if (locale === get().locale) return;
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
    await i18next.changeLanguage(locale);
    set({ locale });

    const shouldBeRtl = isRtl(locale);
    if (I18nManager.isRTL !== shouldBeRtl) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(shouldBeRtl);
      try {
        await Updates.reloadAsync();
      } catch {
        // Expo Go / web can't force-reload natively -- the language text
        // has already changed, only the RTL mirroring needs a manual
        // restart in that environment.
      }
    }
  },
}));

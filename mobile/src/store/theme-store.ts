import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme } from "nativewind";
import { create } from "zustand";

export type ThemePreference = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "najda-theme";

interface ThemeStoreState {
  preference: ThemePreference;
  ready: boolean;
  /** Reads the saved preference (defaulting to "system") and applies it. Call once at boot. */
  bootstrap: () => Promise<void>;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

/**
 * Manual light/dark/system override, on top of NativeWind's own dark-mode
 * handling (tailwind.config.js has darkMode: "class" specifically so this
 * can override the OS setting rather than just following it). Unlike the
 * language switch, this needs no reload -- NativeWind reacts to
 * colorScheme.set() immediately, since it's just a style re-render, not a
 * native-level setting the way I18nManager's RTL flag is.
 */
export const useThemeStore = create<ThemeStoreState>((set) => ({
  preference: "system",
  ready: false,

  bootstrap: async () => {
    const saved = (await AsyncStorage.getItem(THEME_STORAGE_KEY)) as ThemePreference | null;
    const preference = saved ?? "system";
    colorScheme.set(preference);
    set({ preference, ready: true });
  },

  setPreference: async (preference) => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
    colorScheme.set(preference);
    set({ preference });
  },
}));

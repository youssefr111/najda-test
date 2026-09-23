import { useColorScheme } from "nativewind";

/**
 * Tailwind classes (via NativeWind) handle almost all styling now -- this
 * file only exists for the handful of native props that take a raw color
 * value instead of a className: <Ionicons color>, <ActivityIndicator
 * color>, TextInput's placeholderTextColor, and React Navigation's
 * tabBar*TintColor / StatusBar style options. Every value here matches the
 * Tailwind class used alongside it (e.g. "text-blue-600" <-> "#2563eb").
 */
const nativeColors = {
  light: {
    text: "#0f172a", // slate-900
    textMuted: "#64748b", // slate-500
    textInverted: "#ffffff",
    primary: "#2563eb", // blue-600
    danger: "#dc2626", // red-600
    success: "#10b981", // emerald-500
    warning: "#f59e0b", // amber-500
    surface: "#ffffff",
    border: "#e2e8f0", // slate-200
  },
  dark: {
    text: "#f1f5f9", // slate-100
    textMuted: "#94a3b8", // slate-400
    textInverted: "#0f172a",
    primary: "#2563eb",
    danger: "#f87171", // red-400
    success: "#10b981",
    warning: "#f59e0b",
    surface: "#0f172a", // slate-900
    border: "#1e293b", // slate-800
  },
} as const;

export type NativeColors = typeof nativeColors.light;

export function useTheme() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return { colors: isDark ? nativeColors.dark : nativeColors.light, isDark };
}

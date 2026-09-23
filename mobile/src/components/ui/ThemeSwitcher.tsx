import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useThemeStore, type ThemePreference } from "@/store/theme-store";
import { useTheme } from "@/theme";

const OPTIONS: { value: ThemePreference; icon: keyof typeof Ionicons.glyphMap; labelKey: string }[] = [
  { value: "light", icon: "sunny-outline", labelKey: "account.theme.light" },
  { value: "dark", icon: "moon-outline", labelKey: "account.theme.dark" },
  { value: "system", icon: "phone-portrait-outline", labelKey: "account.theme.system" },
];

/** Same select pattern as LanguageSwitcher -- a compact pill for auth screens, a full row for Account. */
export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const [open, setOpen] = useState(false);

  const current = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[2];

  return (
    <View className={compact ? "" : "gap-2"}>
      {!compact ? (
        <Text className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{t("account.theme.label")}</Text>
      ) : null}

      <Pressable
        onPress={() => setOpen(true)}
        className={
          compact
            ? "flex-row items-center gap-1.5 rounded-full border h-10 border-slate-300 bg-white/90 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900/90"
            : "flex-row items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
        }
      >
        <Ionicons name={current.icon} size={compact ? 14 : 18} color={colors.textMuted} />
        <Text className={`mx-1.5 flex-1 font-medium text-slate-900 dark:text-slate-100 ${compact ? "text-xs" : ""}`}>
          {t(current.labelKey)}
        </Text>
        <Ionicons name="chevron-down" size={compact ? 12 : 16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable className="rounded-t-2xl bg-white p-2 pb-6 dark:bg-slate-900" onPress={(e) => e.stopPropagation()}>
            <View className="mb-2 items-center pt-2">
              <View className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            </View>
            {OPTIONS.map((option) => {
              const selected = option.value === preference;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setPreference(option.value);
                    setOpen(false);
                  }}
                  className="flex-row items-center justify-between rounded-xl px-4 py-3.5 active:bg-slate-100 dark:active:bg-slate-800"
                >
                  <View className="flex-row items-center gap-3">
                    <Ionicons name={option.icon} size={18} color={colors.textMuted} />
                    <Text className="text-[16px] text-slate-900 dark:text-slate-100">{t(option.labelKey)}</Text>
                  </View>
                  {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

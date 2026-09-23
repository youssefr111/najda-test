import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "@/store/language-store";
import { LANGUAGES } from "@/lib/locale/languages";
import { useTheme } from "@/theme";

/**
 * A proper select, not a two-way toggle -- driven by LANGUAGES
 * (src/lib/locale/languages.ts), the same list-of-languages source of
 * truth the web app uses. Adding a third language later means editing
 * that one file; this component doesn't change.
 */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const locale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find((l) => l.id === locale) ?? LANGUAGES[0];

  return (
    <View className={compact ? "" : "gap-2"}>
      {!compact ? (
        <Text className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{t("account.language")}</Text>
      ) : null}

      <Pressable
        onPress={() => setOpen(true)}
        className={
          compact
            ? "flex-row items-center gap-1.5 rounded-full border h-10 border-slate-300 bg-white/90 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900/90"
            : "flex-row items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800"
        }
      >
        <Ionicons name="language" size={compact ? 14 : 18} color={colors.textMuted} />
        <Text className={`mx-1.5 flex-1 font-medium text-slate-900 dark:text-slate-100 ${compact ? "text-xs" : ""}`}>
          {current.name}
        </Text>
        <Ionicons name="chevron-down" size={compact ? 12 : 16} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setOpen(false)}>
          <Pressable className="rounded-t-2xl bg-white p-2 pb-6 dark:bg-slate-900" onPress={(e) => e.stopPropagation()}>
            <View className="mb-2 items-center pt-2">
              <View className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            </View>
            {LANGUAGES.map((language) => {
              const selected = language.id === locale;
              return (
                <Pressable
                  key={language.id}
                  onPress={() => {
                    setLocale(language.id);
                    setOpen(false);
                  }}
                  className="flex-row items-center justify-between rounded-xl px-4 py-3.5 active:bg-slate-100 dark:active:bg-slate-800"
                >
                  <Text className="text-[16px] text-slate-900 dark:text-slate-100">{language.name}</Text>
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

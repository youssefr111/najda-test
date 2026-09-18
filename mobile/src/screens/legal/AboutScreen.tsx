import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/Screen";

export function AboutScreen() {
  const { t } = useTranslation();

  return (
    <Screen scroll>
      <View className="mb-8 mt-4 items-center gap-3 rounded-2xl bg-slate-950 px-6 py-10">
        <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-red-400">{t("about.label")}</Text>
        <Text className="text-center text-2xl font-bold text-white">{t("about.title")}</Text>
        <Text className="text-center text-[15px] leading-6 text-slate-300">{t("about.description")}</Text>
      </View>

      <View className="gap-8 pb-8">
        <View>
          <Text className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{t("about.sectionTitle")}</Text>
          <Text className="text-[15px] leading-6 text-slate-600 dark:text-slate-300">
            {t("about.sectionDescription")}
          </Text>
        </View>
        <View>
          <Text className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{t("about.sectionTitle2")}</Text>
          <Text className="text-[15px] leading-6 text-slate-600 dark:text-slate-300">
            {t("about.sectionDescription2")}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

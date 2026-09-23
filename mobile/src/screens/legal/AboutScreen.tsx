import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/Screen";
import { BackHeader } from "@/components/ui/BackHeader";
import { useDirection } from "@/lib/locale/useDirection";

export function AboutScreen() {
  const { t } = useTranslation();
  const align = useDirection() === "rtl" ? "text-right" : "text-left";

  return (
    <Screen scroll>
      <BackHeader title={t("account.aboutLink")} />
      <View className="mb-8 items-center gap-3 rounded-2xl bg-slate-950 px-6 py-10">
        <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-red-400">{t("about.label")}</Text>
        <Text className="text-center text-2xl font-bold text-white">{t("about.title")}</Text>
        <Text className="text-center text-[15px] leading-6 text-slate-300">{t("about.description")}</Text>
      </View>

      <View className="gap-8 pb-8">
        <View>
          <Text className={`mb-2 text-lg font-bold text-slate-900 dark:text-white ${align}`}>
            {t("about.sectionTitle")}
          </Text>
          <Text className={`text-[15px] leading-6 text-slate-600 dark:text-slate-300 ${align}`}>
            {t("about.sectionDescription")}
          </Text>
        </View>
        <View>
          <Text className={`mb-2 text-lg font-bold text-slate-900 dark:text-white ${align}`}>
            {t("about.sectionTitle2")}
          </Text>
          <Text className={`text-[15px] leading-6 text-slate-600 dark:text-slate-300 ${align}`}>
            {t("about.sectionDescription2")}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

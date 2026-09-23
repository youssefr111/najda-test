import type { PropsWithChildren } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/Screen";
import { BackHeader } from "@/components/ui/BackHeader";
import { useDirection } from "@/lib/locale/useDirection";

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  const align = useDirection() === "rtl" ? "text-right" : "text-left";
  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <Text className={`mb-3 text-lg font-bold text-slate-900 dark:text-white ${align}`}>{title}</Text>
      <Text className={`text-[15px] leading-6 text-slate-600 dark:text-slate-300 ${align}`}>{children}</Text>
    </View>
  );
}

export function TermsScreen() {
  const { t } = useTranslation();
  const align = useDirection() === "rtl" ? "text-right" : "text-left";

  return (
    <Screen scroll>
      <BackHeader title={t("account.termsLink")} />
      <View className="mb-6 items-center gap-2 rounded-2xl bg-slate-950 px-6 py-8">
        <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-red-400">
          {t("legal.terms.eyebrow")}
        </Text>
        <Text className="text-center text-2xl font-bold text-white">{t("legal.terms.title")}</Text>
      </View>

      <View className="gap-4 pb-8">
        <View className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30">
          <Text className={`mb-2 text-lg font-bold text-red-800 dark:text-red-300 ${align}`}>
            {t("legal.terms.simulationTitle")}
          </Text>
          <Text className={`text-[15px] leading-6 text-red-700 dark:text-red-300 ${align}`}>
            {t("legal.terms.simulationBody")}
          </Text>
        </View>

        <Section title={t("legal.terms.acceptableUseTitle")}>{t("legal.terms.acceptableUseBody")}</Section>
        <Section title={t("legal.terms.accountsTitle")}>{t("legal.terms.accountsBody")}</Section>
        <Section title={t("legal.terms.applicationsTitle")}>{t("legal.terms.applicationsBody")}</Section>
        <Section title={t("legal.terms.warrantyTitle")}>{t("legal.terms.warrantyBody")}</Section>
        <Section title={t("legal.terms.contactTitle")}>{t("legal.terms.contactBody")}</Section>
      </View>
    </Screen>
  );
}

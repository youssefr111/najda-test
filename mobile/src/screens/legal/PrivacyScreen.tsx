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
      <View className="gap-3">{children}</View>
    </View>
  );
}

function Bullet({ children }: PropsWithChildren) {
  const dir = useDirection();
  return (
    <View className={dir === "rtl" ? "flex-row-reverse gap-2" : "flex-row gap-2"}>
      <Text className="text-slate-400">{"\u2022"}</Text>
      <Text className={`flex-1 text-[15px] leading-6 text-slate-600 dark:text-slate-300 ${dir === "rtl" ? "text-right" : "text-left"}`}>
        {children}
      </Text>
    </View>
  );
}

export function PrivacyScreen() {
  const { t } = useTranslation();
  const align = useDirection() === "rtl" ? "text-right" : "text-left";

  return (
    <Screen scroll>
      <BackHeader title={t("account.privacyLink")} />
      <View className="mb-6 items-center gap-2 rounded-2xl bg-slate-950 px-6 py-8">
        <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-red-400">
          {t("legal.privacy.eyebrow")}
        </Text>
        <Text className="text-center text-2xl font-bold text-white">{t("legal.privacy.title")}</Text>
        <Text className="text-center text-[14px] text-slate-300">{t("legal.privacy.subtitle")}</Text>
      </View>

      <View className="gap-4 pb-8">
        <Section title={t("legal.privacy.collectTitle")}>
          <Bullet>{t("legal.privacy.accountInfo")}</Bullet>
          <Bullet>{t("legal.privacy.locationData")}</Bullet>
          <Bullet>{t("legal.privacy.mediaData")}</Bullet>
          <Bullet>{t("legal.privacy.usageData")}</Bullet>
        </Section>
        <Section title={t("legal.privacy.usedTitle")}>
          <Text className={`text-[15px] leading-6 text-slate-600 dark:text-slate-300 ${align}`}>
            {t("legal.privacy.usedBody1")}
          </Text>
          <Text className={`text-[15px] leading-6 text-slate-600 dark:text-slate-300 ${align}`}>
            {t("legal.privacy.usedBody2")}
          </Text>
        </Section>
        <Section title={t("legal.privacy.storedTitle")}>
          <Text className={`text-[15px] leading-6 text-slate-600 dark:text-slate-300 ${align}`}>
            {t("legal.privacy.storedBody")}
          </Text>
        </Section>
        <Section title={t("legal.privacy.thirdPartiesTitle")}>
          <Text className={`text-[15px] leading-6 text-slate-600 dark:text-slate-300 ${align}`}>
            {t("legal.privacy.thirdPartiesBody")}
          </Text>
        </Section>
        <Section title={t("legal.privacy.dontTitle")}>
          <Text className={`text-[15px] leading-6 text-slate-600 dark:text-slate-300 ${align}`}>
            {t("legal.privacy.dontBody")}
          </Text>
        </Section>
        <Section title={t("legal.privacy.contactTitle")}>
          <Text className={`text-[15px] leading-6 text-slate-600 dark:text-slate-300 ${align}`}>
            {t("legal.privacy.contactBody")}
          </Text>
        </Section>
      </View>
    </Screen>
  );
}

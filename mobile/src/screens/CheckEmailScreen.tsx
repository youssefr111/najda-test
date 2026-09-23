import { Linking, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { useTheme } from "@/theme";
import { config } from "@/constants/config";

export function CheckEmailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();

  return (
    <Screen>
      <View className="mb-2 mt-4 flex-row justify-end gap-2">
        <LanguageSwitcher compact />
        <ThemeSwitcher compact />
      </View>
      <View className="flex-1 items-center justify-center gap-3">
        <Ionicons name="mail-outline" size={48} color={colors.primary} />
        <Text className="text-[22px] font-bold text-slate-900 dark:text-slate-100">{t("auth.checkEmail.title")}</Text>
        <Text className="text-center text-[15px] text-slate-500 dark:text-slate-400">
          {t("auth.checkEmail.body", { email: email ?? "" })}
        </Text>

        <View className="mt-6 w-full gap-2">
          <Button
            label={t("auth.checkEmail.openWebApp")}
            variant="secondary"
            onPress={() => Linking.openURL(config.webAppUrl)}
          />
          <Button label={t("auth.checkEmail.backToLogin")} variant="ghost" onPress={() => router.replace("/login")} />
        </View>
      </View>
    </Screen>
  );
}

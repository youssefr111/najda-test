import { Redirect, Slot } from "expo-router";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import useAuth from "@/hooks/auth/useAuth";
import { useLogout } from "@/hooks/auth/useLogout";
import { CompleteProfileScreen } from "@/screens/CompleteProfileScreen";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";

function ProfileErrorScreen({ message }: { message: string }) {
  const { t } = useTranslation();
  const { refetchProfile } = useAuth();
  const logout = useLogout();

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-3">
        <Text className="text-center text-[15px] font-medium text-slate-900 dark:text-slate-100">
          {t("common.error")}
        </Text>
        <Text className="text-center text-[13px] text-slate-500 dark:text-slate-400">{message}</Text>
        <View className="mt-4 w-full gap-2">
          <Button label={t("common.retry")} onPress={() => refetchProfile()} />
          <Button label={t("account.logout")} variant="ghost" onPress={logout} />
        </View>
      </View>
    </Screen>
  );
}

/**
 * Guards everything under (app): must be authenticated, and must have a
 * completed backend profile. Mirrors the web app's AuthGuard + ProfileGate
 * combined into one gate, since a mobile stack doesn't benefit from
 * splitting them into separate route trees the way Next.js middleware does.
 *
 * A failed/unreachable profile fetch renders an explicit error screen
 * instead of silently bouncing back to /login -- a network problem should
 * be visible and retryable, never a screen that just spins forever.
 */
export default function AppLayout() {
  const { user, status, isProfileLoading, isProfileError, profileError } = useAuth();

  if (status === "loading") return <LoadingOverlay />;
  if (status === "unauthenticated") return <Redirect href="/login" />;
  // Only block on the very first fetch -- once `user` is populated, a
  // later background refetch (isProfileLoading flipping again) must never
  // yank a screen that's already rendered back behind a spinner.
  if (isProfileLoading && !user) return <LoadingOverlay />;

  if (isProfileError && !user) {
    return <ProfileErrorScreen message={profileError instanceof Error ? profileError.message : String(profileError)} />;
  }
  if (!user) return <Redirect href="/login" />;

  if (!user.profileCompleted) return <CompleteProfileScreen user={user} />;

  return <Slot />;
}

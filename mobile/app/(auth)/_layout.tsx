import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "@/store/auth-store";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

/** Signed-in users have no business seeing login/register -- send them into the app. */
export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);

  if (status === "loading") return <LoadingOverlay />;
  if (status === "authenticated") return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

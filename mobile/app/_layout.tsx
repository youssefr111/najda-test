import "../global.css";
import "@/i18n";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { I18nextProvider } from "react-i18next";
import i18next from "@/i18n";
import { useLanguageStore } from "@/store/language-store";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthListener } from "@/providers/AuthListener";
import { useTheme } from "@/theme";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

SplashScreen.preventAutoHideAsync().catch(() => null);

function ThemedStack() {
  const { isDark } = useTheme();
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  const bootstrap = useLanguageStore((s) => s.bootstrap);
  const languageReady = useLanguageStore((s) => s.ready);
  const [splashHidden, setSplashHidden] = useState(false);

  useEffect(() => {
    bootstrap().finally(() => {
      SplashScreen.hideAsync()
        .catch(() => null)
        .finally(() => setSplashHidden(true));
    });
  }, [bootstrap]);

  // Wait for the saved language (and its RTL direction) to be applied
  // before rendering anything -- avoids a visible LTR-then-RTL flash.
  if (!languageReady || !splashHidden) {
    return (
      <SafeAreaProvider>
        <LoadingOverlay />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nextProvider i18n={i18next}>
          <QueryProvider>
            <AuthListener>
              <ThemedStack />
            </AuthListener>
          </QueryProvider>
        </I18nextProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

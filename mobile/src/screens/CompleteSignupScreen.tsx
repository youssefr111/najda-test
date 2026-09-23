import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { firebaseAuth } from "@/firebase/client";
import { config } from "@/constants/config";
import { registerCitizenBootstrap } from "@/lib/auth/registerCitizenBootstrap";
import { resolveAuthErrorKey, resolveRawErrorMessage } from "@/lib/auth/errors";
import { EMAIL_FOR_SIGNIN_KEY } from "@/lib/auth/emailLinkStorage";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

type Stage = "verifying" | "need-email" | "error";

/**
 * Reached two ways: (1) a Universal Link / App Link opens this route
 * directly when the app is installed (see app.json's associatedDomains /
 * intentFilters, and README for the .well-known files that make that
 * work), or (2) the person pastes/taps the link and it opens in a mobile
 * browser, which still works exactly as before via the web app's own
 * /complete-signup page -- this screen only ever runs in case (1).
 *
 * Logic mirrors the web app's /complete-signup/page.tsx one-for-one,
 * minus establishSession() -- mobile has no session cookie to set.
 */
export function CompleteSignupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const [stage, setStage] = useState<Stage>("verifying");
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Firebase's isSignInWithEmailLink/signInWithEmailLink just look for
  // specific query params (mode, oobCode, apiKey, ...) in a string -- it
  // doesn't need to be a real, fetchable URL, so reconstructing one from
  // the route's parsed params is enough.
  const reconstructedUrl = `${config.webAppUrl}/complete-signup?${new URLSearchParams(
    params as Record<string, string>
  ).toString()}`;

  useEffect(() => {
    if (!isSignInWithEmailLink(firebaseAuth, reconstructedUrl)) {
      setError(t("auth.completeSignup.invalidLink"));
      setStage("error");
      return;
    }

    AsyncStorage.getItem(EMAIL_FOR_SIGNIN_KEY).then((savedEmail) => {
      if (savedEmail) completeSignIn(savedEmail);
      else setStage("need-email");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function completeSignIn(email: string) {
    setStage("verifying");
    try {
      const credential = await signInWithEmailLink(firebaseAuth, email, reconstructedUrl);
      await AsyncStorage.removeItem(EMAIL_FOR_SIGNIN_KEY);

      await registerCitizenBootstrap({
        firstName: "",
        lastName: "",
        email: credential.user.email ?? email,
        provider: "email_link",
      });

      // No session cookie to establish on mobile -- the root layout picks
      // up the new Firebase user + backend profile automatically.
      router.replace("/");
    } catch (err) {
      setError(resolveRawErrorMessage(err) ?? t(resolveAuthErrorKey(err)));
      setStage("error");
    }
  }

  if (stage === "verifying") {
    return <LoadingOverlay label={t("auth.completeSignup.confirming")} />;
  }

  if (stage === "need-email") {
    return (
      <Screen scroll className="justify-center">
        <View className="gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Text className="text-[15px] text-slate-600 dark:text-slate-300">
            {t("auth.completeSignup.confirmEmailPrompt")}
          </Text>
          <TextField
            value={emailInput}
            onChangeText={setEmailInput}
            placeholder={t("auth.completeSignup.emailPlaceholder")}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <Button
            label={t("auth.completeSignup.continue")}
            onPress={() => emailInput && completeSignIn(emailInput)}
            disabled={!emailInput}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-[14px] text-red-600 dark:text-red-400">{error}</Text>
      </View>
    </Screen>
  );
}

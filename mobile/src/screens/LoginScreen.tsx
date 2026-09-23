import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/firebase/client";
import { resolveAuthErrorKey, resolveRawErrorMessage } from "@/lib/auth/errors";
import { withTimeout } from "@/lib/withTimeout";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Screen } from "@/components/ui/Screen";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { AppVersionLabel } from "@/components/ui/AppVersionLabel";
import { useDirection } from "@/lib/locale/useDirection";
import { Directional } from "@/components/ui/Directional";

type Mode = "sign-in" | "forgot-password";
//  * Example -- a paragraph that should follow whatever the current language is:
//  *   const dir = useDirection();
//  *   <Directional dir={dir}><Text>{t("about.description")}</Text></Directional>
//  */
export function LoginScreen() {
  const { t } = useTranslation();
  const dir = useDirection();
  const [mode, setMode] = useState<Mode>("sign-in");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      await withTimeout(
        signInWithEmailAndPassword(firebaseAuth, email.trim(), password),
        15000,
        "Sign-in timed out. Check your internet connection and try again."
      );
      // Nothing else to do -- the root layout redirects the moment auth
      // state flips, and useMe() picks up the profile automatically.
    } catch (err) {
      setError(resolveRawErrorMessage(err) ?? t(resolveAuthErrorKey(err)));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, email.trim());
      setResetSent(true);
    } catch (err) {
      setError(resolveRawErrorMessage(err) ?? t(resolveAuthErrorKey(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll className="justify-center">
      <View className="mb-2 mt-4 flex-row justify-end gap-2">
        <LanguageSwitcher compact />
        <ThemeSwitcher compact />
      </View>

      <View className="mb-8 items-center">
        <Image source={require("../../assets/images/logo-stacked.png")} className="h-16 w-16" resizeMode="contain" />
        <Text className="mt-3 text-[15px] text-slate-500 dark:text-slate-400">
          {mode === "forgot-password" ? t("auth.login.resetSubtitle") : t("auth.login.subtitle")}
        </Text>
      </View>

      <Directional dir={dir}>
        
      <View className="gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {mode === "sign-in" ? (
          <>
            <GoogleSignInButton onSignedIn={() => {}} onError={(err) => setError(t(resolveAuthErrorKey(err)))} />

            <View className="my-1 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <Text className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {t("auth.login.or")}
              </Text>
              <View className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </View>

            <TextField
              label={t("auth.login.emailLabel")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <View>
              <TextField
                label={t("auth.login.passwordLabel")}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
              />
              <Pressable
                onPress={() => {
                  setError(null);
                  setResetSent(false);
                  setMode("forgot-password");
                }}
                className="mt-1.5 self-start"
              >
                <Text className="text-xs text-blue-600 dark:text-blue-400">{t("auth.login.forgotPassword")}</Text>
              </Pressable>
            </View>

            {error ? <Text className="text-[13px] text-red-600 dark:text-red-400">{error}</Text> : null}

            <Button
              label={loading ? t("auth.login.signingIn") : t("auth.login.signIn")}
              onPress={handleSubmit}
              loading={loading}
              disabled={!email || !password}
              className="mt-1"
            />
          </>
        ) : (
          <>
            {resetSent ? (
              <Text className="text-[15px] text-slate-600 dark:text-slate-300">
                {t("auth.login.resetSentBefore")} <Text className="font-medium">{email}</Text>{" "}
                {t("auth.login.resetSentAfter")}
              </Text>
            ) : (
              <>
                <TextField
                  label={t("auth.login.emailLabel")}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
                {error ? <Text className="text-[13px] text-red-600 dark:text-red-400">{error}</Text> : null}
                <Button
                  label={loading ? t("auth.login.sending") : t("auth.login.sendResetLink")}
                  onPress={handleForgotPassword}
                  loading={loading}
                  disabled={!email}
                />
              </>
            )}
            <Pressable
              onPress={() => {
                setError(null);
                setResetSent(false);
                setMode("sign-in");
              }}
              className="mt-2 self-center"
            >
              <Text className="text-[15px] text-slate-500 dark:text-slate-400">{t("auth.login.backToSignIn")}</Text>
            </Pressable>
          </>
        )}
      </View>

      {mode === "sign-in" ? (
        <View className="mt-6 flex-row justify-center gap-1.5">
          <Text className="text-slate-500 dark:text-slate-400">{t("auth.login.noAccount")}</Text>
          <Link href="/register">
            <Text className="font-semibold text-blue-600">{t("auth.login.createAccount")}</Text>
          </Link>
        </View>
      ) : null}
      </Directional>

      <AppVersionLabel className="mt-8 items-center" />
    </Screen>
  );
}

import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { Ionicons } from "@expo/vector-icons";
import { GoogleAuthProvider, signInWithCredential, type UserCredential } from "firebase/auth";
import { useTranslation } from "react-i18next";
import { firebaseAuth } from "@/firebase/client";
import { config } from "@/constants/config";
import { useTheme } from "@/theme";

WebBrowser.maybeCompleteAuthSession();

type Props = {
  /** Called after Firebase has a session, with the resulting credential -- e.g. to bootstrap a new citizen row. */
  onSignedIn: (result: UserCredential) => Promise<void> | void;
  onError: (err: unknown) => void;
};

/**
 * Native Google sign-in via expo-auth-session (works in Expo Go, no
 * native module / prebuild required), exchanged for a Firebase credential.
 * Requires EXPO_PUBLIC_GOOGLE_*_CLIENT_ID to be set -- see .env.example.
 */
export function GoogleSignInButton({ onSignedIn, onError }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: config.google.iosClientId,
    androidClientId: config.google.androidClientId,
    webClientId: config.google.webClientId,
  });

  useEffect(() => {
    if (response?.type !== "success") return;

    (async () => {
      setLoading(true);
      try {
        const idToken = response.params.id_token;
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(firebaseAuth, credential);
        await onSignedIn(result);
      } catch (err) {
        onError(err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const isDisabled = !request || loading;

  return (
    <Pressable
      onPress={() => promptAsync()}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-2 rounded-md border border-slate-300 bg-white py-3 dark:border-slate-700 dark:bg-slate-900 active:bg-slate-50 dark:active:bg-slate-800 ${
        isDisabled ? "opacity-50" : ""
      }`}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          <Ionicons name="logo-google" size={18} color="#4285F4" />
          <Text className="text-[15px] font-medium text-slate-700 dark:text-slate-200">
            {t("auth.login.continueWithGoogle")}
          </Text>
        </>
      )}
    </Pressable>
  );
}

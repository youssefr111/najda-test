import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSetUnverifiedPhone } from "@/hooks/auth/useSetUnverifiedPhone";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import type { User } from "@/types/user";

/**
 * Unlike email change, phone verification needs an SMS OTP, which the
 * Firebase JS SDK implements via an invisible reCAPTCHA that requires a DOM
 * -- it does not run in React Native at all (confirmed broken even with
 * `expo-firebase-recaptcha`, which Expo deprecated and removed in SDK 48).
 * A real fix means migrating to @react-native-firebase/auth (a native
 * module, incompatible with Expo Go) or a custom WebView reCAPTCHA bridge.
 * Until then, this saves the number as unverified, same as registration
 * does, and says so plainly rather than pretending to verify it.
 */
export function PhoneChangeSection({ user }: { user: User }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(user.phone ?? "");
  const setUnverifiedPhone = useSetUnverifiedPhone();

  function handleSave() {
    setUnverifiedPhone.mutate(phone, { onSuccess: () => setEditing(false) });
  }

  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t("account.phoneChange.label")}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <Text className="text-[15px] text-slate-900 dark:text-slate-100">{user.phone ?? "—"}</Text>
            {user.phone ? (
              user.phoneVerified ? (
                <Ionicons name="checkmark-circle" size={13} color="#059669" />
              ) : (
                <Text className="text-xs text-amber-600 dark:text-amber-400">({t("account.unverified")})</Text>
              )
            ) : null}
          </View>
        </View>
        {!editing ? (
          <Pressable onPress={() => setEditing(true)}>
            <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">{t("account.phoneChange.change")}</Text>
          </Pressable>
        ) : null}
      </View>

      {editing ? (
        <View className="mt-2 gap-2">
          <TextField
            value={phone}
            onChangeText={setPhone}
            placeholder={t("account.phoneChange.phonePlaceholder")}
            keyboardType="phone-pad"
          />
          <Text className="text-xs text-slate-500 dark:text-slate-400">{t("account.phoneChange.verificationNotice")}</Text>
          {setUnverifiedPhone.isError ? (
            <Text className="text-xs text-red-600 dark:text-red-400">{t("common.error")}</Text>
          ) : null}
          <View className="flex-row gap-2">
            <Button label={t("account.phoneChange.cancel")} variant="secondary" onPress={() => setEditing(false)} className="flex-1" />
            <Button
              label={setUnverifiedPhone.isPending ? t("common.saving") : t("account.phoneChange.save")}
              onPress={handleSave}
              loading={setUnverifiedPhone.isPending}
              disabled={!phone}
              className="flex-1"
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

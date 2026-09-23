import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRequestEmailChange } from "@/hooks/auth/useRequestEmailChange";
import { useEmailChangeWatcher } from "@/hooks/auth/useEmailChangeWatcher";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import type { User } from "@/types/user";

export function EmailChangeSection({ user }: { user: User }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState(user.email);
  const [pendingFrom, setPendingFrom] = useState<string | null>(null);
  const requestEmailChange = useRequestEmailChange();
  useEmailChangeWatcher(pendingFrom);

  function handleSend() {
    requestEmailChange.mutate(newEmail, {
      onSuccess: () => setPendingFrom(user.email),
    });
  }

  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t("account.email")}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <Text className="text-[15px] text-slate-900 dark:text-slate-100">{user.email}</Text>
            {user.emailVerified ? (
              <Ionicons name="checkmark-circle" size={13} color="#059669" />
            ) : (
              <Text className="text-xs text-amber-600 dark:text-amber-400">({t("account.unverified")})</Text>
            )}
          </View>
        </View>
        {!editing && !pendingFrom ? (
          <Pressable onPress={() => setEditing(true)}>
            <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">{t("account.emailChange.change")}</Text>
          </Pressable>
        ) : null}
      </View>

      {editing ? (
        <View className="mt-2 gap-2">
          <TextField
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder={t("account.emailChange.newEmailPlaceholder")}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {requestEmailChange.isError ? (
            <Text className="text-xs text-red-600 dark:text-red-400">
              {requestEmailChange.error instanceof Error && requestEmailChange.error.message === "emailAlreadyInUse"
                ? t("account.emailChange.emailAlreadyInUse")
                : t("common.error")}
            </Text>
          ) : null}
          <View className="flex-row gap-2">
            <Button label={t("account.emailChange.cancel")} variant="secondary" onPress={() => setEditing(false)} className="flex-1" />
            <Button
              label={requestEmailChange.isPending ? t("common.sending") : t("account.emailChange.sendLink")}
              onPress={handleSend}
              loading={requestEmailChange.isPending}
              disabled={!newEmail || newEmail === user.email}
              className="flex-1"
            />
          </View>
        </View>
      ) : null}

      {pendingFrom ? (
        <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("account.emailChange.confirmationSentBefore")} {newEmail}. {t("account.emailChange.confirmationSentAfter")}
        </Text>
      ) : null}
    </View>
  );
}

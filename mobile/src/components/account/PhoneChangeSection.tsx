import { useState, useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSetUnverifiedPhone } from "@/hooks/auth/useSetUnverifiedPhone";
import { useSyncPhone } from "@/hooks/auth/useSyncPhone";
import { usePhoneVerification } from "@/hooks/auth/usePhoneVerification";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { PhoneField, isValidEgyptianMobile, toE164EgyptianPhone } from "@/components/auth/PhoneField";
import type { User } from "@/types/user";

export function PhoneChangeSection({ user, resetKey }: { user: User, resetKey: number }) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [localPhone, setLocalPhone] = useState(user.phone ? user.phone.replace("+20", "") : "");
  const [invalid, setInvalid] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const setUnverifiedPhone = useSetUnverifiedPhone();
  const syncPhone = useSyncPhone();
  const verification = usePhoneVerification();

  const isConfirming = pendingPhone !== null;

  function handlePhoneChange(v: string) {
    setLocalPhone(v);
    setInvalid(false);
    setFormError(null);
    setPendingPhone(null);
  }

  function handleCancelEdit() {
    setLocalPhone(user.phone ? user.phone.replace("+20", "") : "");
    setInvalid(false);
    setFormError(null);
    setPendingPhone(null);
    setEditing(false);
  }

  function handleSubmit() {
    setFormError(null);

    const e164Phone = toE164EgyptianPhone(localPhone);

    // Same verified phone: it's valid, but it cannot be saved as a change.
    if (user.phoneVerified && e164Phone === user.phone) {
      setInvalid(false);
      setFormError(t("account.phoneChange.samePhoneError"));
      return;
    }

    // Different phone: validate Egyptian format.
    if (!isValidEgyptianMobile(localPhone)) {
      setInvalid(true);
      setFormError(null);
      return;
    }

    setInvalid(false);
    setFormError(null);
    setPendingPhone(e164Phone);
  }

  function handleConfirmSave() {
    if (!pendingPhone) return;
    setFormError(null);
    setUnverifiedPhone.mutate(pendingPhone, {
      onSuccess: () => {
        setEditing(false);
        setPendingPhone(null);
        setVerifying(true);
      },
      onError: (err) => {
        setFormError(err instanceof Error ? err.message : t("common.error"));
      },
    });
  }

  async function handleConfirmCode() {
    const success = await verification.confirmCode(otpCode);
    if (success) {
      await syncPhone.mutateAsync();
      setVerifying(false);
      setOtpCode("");
    }
  }

  useEffect(() => {
    setEditing(false);
    setVerifying(false);
    setLocalPhone(user.phone ? user.phone.replace("+20", "") : "");
    setInvalid(false);
    setFormError(null);
    setPendingPhone(null);
    setOtpCode("");
  }, [resetKey]);

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
        {!editing && !verifying ? (
          <Pressable onPress={() => setEditing(true)}>
            <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">{t("account.phoneChange.change")}</Text>
          </Pressable>
        ) : null}
      </View>

      {editing ? (
        <View className="mt-2 gap-2">
          <PhoneField
            value={localPhone}
            noLabel
            editable={!isConfirming}
            onChange={handlePhoneChange}
            error={invalid}
          />

          {formError ? <Text className="text-xs text-red-600 dark:text-red-400">{formError}</Text> : null}

          {isConfirming ? (
            <View className="gap-2.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 px-3 py-2.5">
              <View className="flex-row items-start gap-2">
                <Ionicons name="information-circle-outline" size={16} color="#1d4ed8" style={{ marginTop: 1 }} />
                <Text className="flex-1 text-sm text-blue-800 dark:text-blue-300">
                  {t("account.phoneChange.confirmChangeMessage", { phone: pendingPhone })}
                </Text>
              </View>
              <View className="flex-row gap-2">
                <Button
                  label={t("account.phoneChange.goBack")}
                  variant="secondary"
                  onPress={() => setPendingPhone(null)}
                  disabled={setUnverifiedPhone.isPending}
                  className="flex-1"
                />
                <Button
                  label={setUnverifiedPhone.isPending ? t("common.saving") : t("account.phoneChange.confirmChange")}
                  onPress={handleConfirmSave}
                  loading={setUnverifiedPhone.isPending}
                  className="flex-1"
                />
              </View>
            </View>
          ) : (
            <View className="flex-row gap-2">
              <Button label={t("account.phoneChange.cancel")} variant="secondary" onPress={handleCancelEdit} className="flex-1" />
              <Button label={t("account.phoneChange.save")} onPress={handleSubmit} disabled={!localPhone} className="flex-1" />
            </View>
          )}
        </View>
      ) : null}

      {!user.phoneVerified && user.phone && !editing && !verifying ? (
        <Pressable onPress={() => setVerifying(true)} className="mt-1">
          <Text className="text-xs font-medium text-blue-600 dark:text-blue-400">{t("account.phoneChange.verifyNumber")}</Text>
        </Pressable>
      ) : null}

      {verifying ? (
        <View className="mt-2 gap-2">
          {verification.stage === "idle" ? (
            <Button
              label={verification.sending ? t("account.phoneChange.sendingCode") : t("account.phoneChange.sendCode")}
              variant="secondary"
              onPress={() => verification.sendCode(toE164EgyptianPhone(localPhone))}
              loading={verification.sending}
              disabled={!localPhone}
            />
          ) : (
            <>
              <TextField
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder={t("account.phoneChange.codePlaceholder")}
                keyboardType="number-pad"
              />
              <Button
                label={t("common.confirm")}
                onPress={handleConfirmCode}
                loading={verification.confirming}
                disabled={!otpCode}
              />
              <Pressable
                onPress={() => {
                  verification.reset();
                  verification.sendCode(toE164EgyptianPhone(localPhone));
                }}
                disabled={verification.sending}
              >
                <Text className="text-xs text-blue-600 dark:text-blue-400">{t("account.phoneChange.resendCode")}</Text>
              </Pressable>
            </>
          )}

          {verification.error ? (
            <Text className="text-xs text-red-600 dark:text-red-400">
              {verification.error === "codeError" ? t("account.phoneChange.codeError") : verification.error}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
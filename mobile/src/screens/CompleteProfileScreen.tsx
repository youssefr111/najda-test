import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { updatePassword } from "firebase/auth";
import { useTranslation } from "react-i18next";
import { firebaseAuth } from "@/firebase/client";
import { resolveAuthErrorKey, resolveRawErrorMessage } from "@/lib/auth/errors";
import { isPasswordValid } from "@/lib/auth/password-rules";
import { isValidEgyptianMobile, toE164EgyptianPhone } from "@/lib/auth/phone";
import { useUpdateProfile } from "@/hooks/users/useUpdateProfile";
import { useSetUnverifiedPhone } from "@/hooks/auth/useSetUnverifiedPhone";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import type { Gender, User } from "@/types/user";

export function CompleteProfileScreen({ user }: { user: User }) {
  const { t } = useTranslation();

  const updateProfile = useUpdateProfile(user.id);
  const setUnverifiedPhone = useSetUnverifiedPhone();

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [address, setAddress] = useState(user.address ?? "");
  const [gender, setGender] = useState<Gender>(user.gender ?? "MALE");
  const [localPhone, setLocalPhone] = useState(user.phone ? user.phone.replace("+20", "") : "");
  const phoneAlreadyVerified = !!user.phone && user.phoneVerified;
  const [phoneInvalid, setPhoneInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = submitting || updateProfile.isPending || setUnverifiedPhone.isPending;

  async function handleSubmit() {
    setError(null);

    if (!phoneAlreadyVerified && !isValidEgyptianMobile(localPhone)) {
      setPhoneInvalid(true);
      setError(t("auth.completeProfile.invalidPhone"));
      return;
    }
    setPhoneInvalid(false);

    if (!isPasswordValid(password)) {
      setError(t("auth.completeProfile.passwordInvalid"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.completeProfile.passwordMismatch"));
      return;
    }

    setSubmitting(true);
    try {
      const currentUser = firebaseAuth.currentUser;

      // These three calls don't depend on each other's results -- running
      // them in parallel instead of one-after-another is what was making
      // this screen feel stuck: three sequential mobile-network round
      // trips add up fast compared to a browser hitting a local dev server.
      await Promise.all([
        currentUser ? updatePassword(currentUser, password) : Promise.resolve(),
        updateProfile.mutateAsync({ firstName, lastName, address, gender }),
        phoneAlreadyVerified ? Promise.resolve() : setUnverifiedPhone.mutateAsync(toE164EgyptianPhone(localPhone)),
      ]);
    } catch (err) {
      setError(resolveRawErrorMessage(err) ?? t(resolveAuthErrorKey(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <View className="mb-6 mt-8">
        <Text className="text-[22px] font-bold text-slate-900 dark:text-slate-100">
          {t("auth.completeProfile.title")}
        </Text>
        <Text className="mt-1 text-[15px] text-slate-500 dark:text-slate-400">
          {t("auth.completeProfile.subtitle")}
        </Text>
      </View>

      <View className="gap-3">
        <View className="flex-row gap-2">
          <View className="flex-1">
            <TextField label={t("auth.completeProfile.firstName")} value={firstName} onChangeText={setFirstName} />
          </View>
          <View className="flex-1">
            <TextField label={t("auth.completeProfile.lastName")} value={lastName} onChangeText={setLastName} />
          </View>
        </View>

        {phoneAlreadyVerified ? (
          <View className="gap-1.5">
            <Text className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
              {t("auth.completeProfile.phone")}
            </Text>
            <Text className="text-slate-900 dark:text-slate-100">
              {user.phone} · {t("auth.completeProfile.phoneVerified")}
            </Text>
          </View>
        ) : (
          <TextField
            label={t("auth.completeProfile.phone")}
            value={localPhone}
            onChangeText={(v) => setLocalPhone(v.replace(/\D/g, "").slice(0, 10))}
            keyboardType="number-pad"
            placeholder="1012345678"
            error={phoneInvalid ? t("auth.completeProfile.invalidPhone") : null}
          />
        )}

        <TextField label={t("auth.completeProfile.address")} value={address} onChangeText={setAddress} />

        <View className="gap-1.5">
          <Text className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">
            {t("auth.completeProfile.gender")}
          </Text>
          <View className="flex-row gap-2">
            {(["MALE", "FEMALE"] as Gender[]).map((option) => {
              const selected = gender === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setGender(option)}
                  className={`flex-1 items-center rounded-xl border-[1.5px] py-2 ${
                    selected
                      ? "border-blue-600 bg-slate-100 dark:bg-slate-800"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <Text
                    className={`font-semibold ${selected ? "text-blue-600" : "text-slate-900 dark:text-slate-100"}`}
                  >
                    {t(`enums.gender.${option}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField
          label={t("auth.completeProfile.newPassword")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
        />
        <TextField
          label={t("auth.completeProfile.confirmPassword")}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          textContentType="newPassword"
        />
        <Text className="text-xs text-slate-500 dark:text-slate-400">{t("auth.completeProfile.passwordHint")}</Text>

        {error ? <Text className="text-[13px] text-red-600 dark:text-red-400">{error}</Text> : null}

        <Button
          label={busy ? t("common.saving") : t("auth.completeProfile.save")}
          onPress={handleSubmit}
          loading={busy}
          disabled={!firstName || !lastName || !address}
        />
      </View>
    </Screen>
  );
}

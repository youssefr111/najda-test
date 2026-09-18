"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updatePassword } from "firebase/auth";
import { Check, Loader2 } from "lucide-react";
import { useUpdateProfile } from "@/hooks/users/useUpdateProfile";
import { useSetUnverifiedPhone } from "@/hooks/auth/useSetUnverifiedPhone";
import { resolveAuthError } from "@/lib/auth/errors";
import { isPasswordValid } from "@/lib/auth/password-rules";
import { firebaseAuth } from "@/lib/firebase/client";
import PasswordRequirements from "./PasswordRequirements";
import PhoneField, { isValidEgyptianMobile, toE164EgyptianPhone } from "./PhoneField";
import type { User, Gender } from "@/types/user";

export default function CompleteProfileForm({ user }: { user: User }) {
  const t = useTranslations("auth.completeProfile");
  const tErrors = useTranslations("auth.errors");
  const updateProfile = useUpdateProfile(user.id);
  const setUnverifiedPhone = useSetUnverifiedPhone();

  //const hasPasswordProvider = firebaseAuth.currentUser?.providerData.some((p) => p.providerId === "password") ?? true;

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [address, setAddress] = useState(user.address ?? "");
  const [gender, setGender] = useState<Gender>(user.gender ?? "MALE");
  const [localPhone, setLocalPhone] = useState(user.phone ? user.phone.replace("+20", "") : "");
  const phoneAlreadyVerified = !!user.phone && user.phoneVerified;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phoneInvalid, setPhoneInvalid] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);

  const busy = updateProfile.isPending || setUnverifiedPhone.isPending || settingPassword;

  function validatePhone(): boolean {
    if (phoneAlreadyVerified) return true;
    const valid = isValidEgyptianMobile(localPhone);
    setPhoneInvalid(!valid);
    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validatePhone()) return;
    const phone = phoneAlreadyVerified ? user.phone! : toE164EgyptianPhone(localPhone);

    if (!phoneAlreadyVerified) {
      await setUnverifiedPhone.mutateAsync(phone);
    }

    if (!isPasswordValid(password)) {
      setError(t("passwordInvalid"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    try {
      setSettingPassword(true);
      const currentUser = firebaseAuth.currentUser;
      if (currentUser) await updatePassword(currentUser, password);

      await updateProfile.mutateAsync({ firstName, lastName, address, gender });
      await setUnverifiedPhone.mutateAsync(phone);
    } catch (err) {
      setError(resolveAuthError(err, tErrors));
    } finally {
      setSettingPassword(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">{t("subtitle")}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t("firstName")}
              required
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t("lastName")}
              required
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm"
            />
          </div>

          {phoneAlreadyVerified ? (
            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <Check className="w-4 h-4 text-emerald-500" />
              <span dir="ltr">{user.phone}</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">— already verified</span>
            </div>
          ) : (
            <PhoneField value={localPhone} onChange={setLocalPhone} error={phoneInvalid} />
          )}

          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("address")}
            required
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm"
          />
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm"
          >
            <option value="MALE">{t("male")}</option>
            <option value="FEMALE">{t("female")}</option>
          </select>

          <>
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("password")}
                autoComplete="new-password"
                required
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm"
              />
              <PasswordRequirements password={password} />
            </div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("confirmPassword")}
              autoComplete="new-password"
              required
              className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm"
            />
          </>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={busy || !firstName || !lastName || !address || (!phoneAlreadyVerified && !localPhone)}
            className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? t("saving") : t("finishSetup")}
          </button>
        </form>
      </div>
    </div>
  );
}
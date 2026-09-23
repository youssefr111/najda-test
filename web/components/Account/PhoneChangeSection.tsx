"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  linkWithPhoneNumber,
  updatePhoneNumber,
  PhoneAuthProvider,
  type ConfirmationResult,
} from "firebase/auth";
import { Check, Loader2, Info } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";
import { LANGUAGES } from "@/lib/locale/languages";
import { useRecaptchaVerifier } from "@/hooks/auth/useRecaptchaVerifier";
import { useSetUnverifiedPhone } from "@/hooks/auth/useSetUnverifiedPhone";
import { useSyncPhone } from "@/hooks/auth/useSyncPhone";
import { resolveAuthError } from "@/lib/auth/errors";
import type { User } from "@/types/user";
import PhoneField, { isValidEgyptianMobile, toE164EgyptianPhone } from "@/components/Auth/PhoneField";

export default function PhoneChangeSection({ user }: { user: User }) {
  const t = useTranslations("account.phoneChange");
  const locale = useLocale();
  const dir = LANGUAGES.find(l => l.id === locale)?.dir ?? "ltr";
  const tCommon = useTranslations("common");
  const tAccount = useTranslations("account");
  const tErrors = useTranslations("auth.errors");
  const { getVerifier } = useRecaptchaVerifier("recaptcha-container-phone-change");
  const setUnverifiedPhone = useSetUnverifiedPhone();
  const syncPhone = useSyncPhone();

  const [editing, setEditing] = useState(false);
  const [newPhone, setNewPhone] = useState(user.phone ? user.phone.replace("+20", "") : "");
  const [invalid, setInvalid] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirming = pendingPhone !== null;

  function resetEditState() {
    setNewPhone(user.phone ? user.phone.replace("+20", "") : "");
    setInvalid(false);
    setFormError(null);
    setPendingPhone(null);
  }

  function handleCancelEdit() {
    resetEditState();
    setEditing(false);
  }

  function handlePhoneFieldChange(v: string) {
    setNewPhone(v);
    setInvalid(false);
    setFormError(null);
    setPendingPhone(null);
  }

  function handleSavePhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFormError(null);

    const e164Phone = toE164EgyptianPhone(newPhone);

    // Same phone: don't mark it as an invalid Egyptian number.
    if (user.phoneVerified && e164Phone === user.phone) {
      setInvalid(false);
      setFormError(t("samePhoneError"));
      return;
    }

    // Different phone: validate Egyptian format.
    if (!isValidEgyptianMobile(newPhone)) {
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
        setInvalid(false);
        setPendingPhone(null);
        setVerifying(true);
      },
      onError: (err) => {
        setFormError(err instanceof Error ? err.message : t("saveError"));
      },
    });
  }

  async function handleSendCode() {
    setError(null);
    if (!isValidEgyptianMobile(newPhone)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setBusy(true);
    try {
      const currentUser = firebaseAuth.currentUser!;
      const verifier = getVerifier();
      const e164Phone = toE164EgyptianPhone(newPhone);
      if (currentUser.phoneNumber) {
        const provider = new PhoneAuthProvider(firebaseAuth);
        setVerificationId(await provider.verifyPhoneNumber(e164Phone, verifier));
      } else {
        setConfirmationResult(await linkWithPhoneNumber(currentUser, e164Phone, verifier));
      }
    } catch (err) {
      setError(resolveAuthError(err, tErrors));
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmCode() {
    setError(null);
    setBusy(true);
    try {
      const currentUser = firebaseAuth.currentUser!;
      if (confirmationResult) {
        await confirmationResult.confirm(otpCode);
      } else if (verificationId) {
        await updatePhoneNumber(currentUser, PhoneAuthProvider.credential(verificationId, otpCode));
      }
      await currentUser.getIdToken(true);
      await syncPhone.mutateAsync();
      setVerifying(false);
      setConfirmationResult(null);
      setVerificationId(null);
      setOtpCode("");
    } catch {
      setError(t("codeError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div id="recaptcha-container-phone-change" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{t("label")}</p>
          <p className="text-sm text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-1.5" dir="ltr">
            {user.phone ?? "—"}
            {user.phone &&
              (user.phoneVerified ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> {tAccount("verified")}
                </span>
              ) : (
                <span className="text-xs text-amber-600 dark:text-amber-400" dir="auto">({tAccount("unverified")})</span>
              ))}
          </p>
        </div>
        {!editing && !verifying && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
            {t("change")}
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={handleSavePhone} className="flex flex-col gap-2 mt-2">
          <PhoneField
            value={newPhone}
            noLabel={true}
            disabled={isConfirming}
            onChange={handlePhoneFieldChange}
            error={invalid}
          />

          {formError && <p className="text-xs text-red-600 dark:text-red-400" dir={dir}>{formError}</p>}

          {isConfirming ? (
            <div className="flex flex-col gap-2.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 px-3 py-2.5">
              <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300" dir={dir}>
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  {t("confirmChangeMessage", { phone: pendingPhone ?? "" })}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPendingPhone(null)}
                  disabled={setUnverifiedPhone.isPending}
                  className="px-3 py-2 cursor-pointer border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  {t("goBack")}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  disabled={setUnverifiedPhone.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 cursor-pointer bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {setUnverifiedPhone.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {setUnverifiedPhone.isPending ? "\u2026" : t("confirmChange")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-2 cursor-pointer border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                className="px-3 py-2 cursor-pointer bg-blue-600 text-white text-sm font-medium rounded-md disabled:opacity-50"
              >
                {t("save")}
              </button>
            </div>
          )}
        </form>
      )}

      {!user.phoneVerified && user.phone && !editing && !verifying && (
        <button type="button" onClick={() => setVerifying(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1">
          {t("verifyNumber")}
        </button>
      )}

      {verifying && (
        <div className="mt-2 flex flex-col gap-2">
          {!confirmationResult && !verificationId ? (
            <>
              <PhoneField
                value={newPhone}
                noLabel={true}
                onChange={(v) => {
                  setNewPhone(v);
                  setInvalid(false);
                }}
                error={invalid}
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={busy || !newPhone}
                className="self-start px-3 py-2 cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-md disabled:opacity-50"
              >
                {busy ? t("sendingCode") : t("sendCode")}
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder={t("codePlaceholder")}
                  className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm text-start"
                />
                <button
                  type="button"
                  onClick={handleConfirmCode}
                  disabled={busy || !otpCode}
                  className="flex items-center gap-1.5 px-3 py-2 cursor-pointer bg-blue-600 text-white text-sm font-medium rounded-md disabled:opacity-50"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {tCommon("confirm")}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConfirmationResult(null);
                  setVerificationId(null);
                  handleSendCode();
                }}
                disabled={busy}
                className="self-start text-xs cursor-pointer text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
              >
                {t("resendCode")}
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  );
}
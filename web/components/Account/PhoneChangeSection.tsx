"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  linkWithPhoneNumber,
  updatePhoneNumber,
  PhoneAuthProvider,
  type ConfirmationResult,
} from "firebase/auth";
import { Check, Loader2 } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";
import { useRecaptchaVerifier } from "@/hooks/auth/useRecaptchaVerifier";
import { useSetUnverifiedPhone } from "@/hooks/auth/useSetUnverifiedPhone";
import { useSyncPhone } from "@/hooks/auth/useSyncPhone";
import { resolveAuthError } from "@/lib/auth/errors";
import type { User } from "@/types/user";

export default function PhoneChangeSection({ user }: { user: User }) {
  const t = useTranslations("account.phoneChange");
  const tCommon = useTranslations("common");
  const tAccount = useTranslations("account");
  const tErrors = useTranslations("auth.errors");
  const { getVerifier } = useRecaptchaVerifier("recaptcha-container-phone-change");
  const setUnverifiedPhone = useSetUnverifiedPhone();
  const syncPhone = useSyncPhone();

  const [editing, setEditing] = useState(false);
  const [newPhone, setNewPhone] = useState(user.phone ?? "");
  const [verifying, setVerifying] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSavePhone(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnverifiedPhone.mutate(newPhone, {
      onSuccess: () => {
        setEditing(false);
        setVerifying(true);
      },
    });
  }

  async function handleSendCode() {
    setError(null);
    setBusy(true);
    try {
      const currentUser = firebaseAuth.currentUser!;
      const verifier = getVerifier();
      if (currentUser.phoneNumber) {
        const provider = new PhoneAuthProvider(firebaseAuth);
        setVerificationId(await provider.verifyPhoneNumber(newPhone, verifier));
      } else {
        setConfirmationResult(await linkWithPhoneNumber(currentUser, newPhone, verifier));
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
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
            {t("change")}
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={handleSavePhone} className="flex gap-2 mt-2">
          <input
            type="tel"
            dir="ltr"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder={t("phonePlaceholder")}
            className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-start"
          />
          <button
            type="submit"
            disabled={setUnverifiedPhone.isPending}
            className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md disabled:opacity-50"
          >
            {setUnverifiedPhone.isPending ? "\u2026" : t("save")}
          </button>
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
              <input
                type="tel"
                dir="ltr"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-md text-sm text-start"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={busy || !newPhone}
                className="self-start px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-md disabled:opacity-50"
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
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md disabled:opacity-50"
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
                className="self-start text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
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
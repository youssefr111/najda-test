"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useRequestEmailChange } from "@/hooks/auth/useRequestEmailChange";
import { useEmailChangeWatcher } from "@/hooks/auth/useEmailChangeWatcher";
import { useResendEmailVerification } from "@/hooks/auth/useResendEmailVerification";
import { useEmailVerificationWatcher } from "@/hooks/auth/useEmailVerificationWatcher";
import { firebaseAuth } from "@/lib/firebase/client";
import { resolveAuthError } from "@/lib/auth/errors";
import type { User } from "@/types/user";
import VerificationBadge from "./VerificationBadge";
import { DETAIL_LABEL_CLASS, FIELD_CLASS, LINK_BUTTON_CLASS } from "./styles";
import { GoogleAuthProvider } from "firebase/auth";
import GoogleIcon from "../ui/GoogleIcon";

export default function EmailSection({ user }: { user: User }) {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("auth.errors");

  const hasGoogleProvider = firebaseAuth.currentUser?.providerData.some(
    (p) => p.providerId === GoogleAuthProvider.PROVIDER_ID
  );

  const [isChanging, setIsChanging] = useState(false);
  const [newEmail, setNewEmail] = useState(user.email);
  const [pendingEmailChangeFrom, setPendingEmailChangeFrom] = useState<string | null>(null);

  useEmailChangeWatcher(pendingEmailChangeFrom);
  useEmailVerificationWatcher(!user.emailVerified);
  const requestEmailChange = useRequestEmailChange(tErrors);
  const resendVerification = useResendEmailVerification(tErrors);

  function openChangeForm() {
    requestEmailChange.reset();
    setNewEmail(user.email);
    setIsChanging(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    requestEmailChange.mutate(newEmail, {
      onSuccess: () => {
        setPendingEmailChangeFrom(user.email);
        setIsChanging(false);
      },
    });
  }

  return (
    <div>
      <p className={DETAIL_LABEL_CLASS}>{t("email")}</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-900 dark:text-slate-100">
        <span className="break-all">{user.email}</span>
        <VerificationBadge verified={user.emailVerified} />
        {hasGoogleProvider && <GoogleIcon />}
      </div>

      {!isChanging && (
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
          {!user.emailVerified && (
            <button
              type="button"
              onClick={() => resendVerification.mutate()}
              disabled={resendVerification.isPending}
              className={LINK_BUTTON_CLASS}
            >
              {resendVerification.isPending ? t("sendingVerification") : t("sendVerificationEmail")}
            </button>
          )}
          {!hasGoogleProvider &&
            <button type="button" onClick={openChangeForm} className={LINK_BUTTON_CLASS}>
              {t("changeEmail")}
            </button>
          }
        </div>
      )}

      {isChanging && (
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            autoComplete="email"
            required
            dir="ltr"
            className={`${FIELD_CLASS} min-w-0 flex-1 text-start`}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsChanging(false)}
              className="flex-1 sm:flex-none px-3 py-2 text-sm font-medium rounded-md cursor-pointer border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={requestEmailChange.isPending}
              className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md cursor-pointer bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {requestEmailChange.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t("sendLink")}
            </button>
          </div>
        </form>
      )}

      {resendVerification.isSuccess && (
        <p role="status" className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{t("verificationSent")}</p>
      )}
      {requestEmailChange.isSuccess && (
        <p role="status" className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
          {t("confirmationSentBefore")} {newEmail}. {t("confirmationSentAfter")}
        </p>
      )}
      {requestEmailChange.isError && (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {resolveAuthError(requestEmailChange.error, tErrors)}
        </p>
      )}
      {pendingEmailChangeFrom && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("waitingForConfirmation")}</p>
      )}
    </div>
  );
}
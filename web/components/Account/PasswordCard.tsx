"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Info } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase/client";
import { useChangePassword } from "@/hooks/auth/useChangePassword";
import { resolveAuthError } from "@/lib/auth/errors";
import { isPasswordValid } from "@/lib/auth/password-rules";
import PasswordRequirements from "@/components/Auth/PasswordRequirements";
import AccountCard from "./AccountCard";
import FormActions from "./FormActions";
import { FIELD_CLASS, LABEL_CLASS } from "./styles";

export default function PasswordCard() {
  const t = useTranslations("account");
  const tErrors = useTranslations("auth.errors");
  const changePassword = useChangePassword(tErrors);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const hasPasswordProvider = firebaseAuth.currentUser?.providerData.some((p) => p.providerId === "password");
  const mismatch = confirmPassword !== "" && newPassword !== confirmPassword;
  const canSubmit = currentPassword !== "" && isPasswordValid(newPassword) && newPassword === confirmPassword;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
      },
    );
  }

  return (
    <AccountCard title={t("security.passwordTitle")} description={t("security.passwordDescription")}>
      {hasPasswordProvider ? (
        <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
          <PasswordField
            label={t("currentPassword")}
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
          />
          <div>
            <PasswordField
              label={t("newPassword")}
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />
            <PasswordRequirements password={newPassword} />
          </div>
          <div>
            <PasswordField
              label={t("confirmNewPassword")}
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            {mismatch && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t("passwordsDontMatch")}</p>}
          </div>

          {changePassword.isError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {resolveAuthError(changePassword.error, tErrors)}
            </p>
          )}
          {changePassword.isSuccess && (
            <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">{t("passwordUpdated")}</p>
          )}

          <FormActions
            submitLabel={t("changePassword")}
            pendingLabel={t("updating")}
            pending={changePassword.isPending}
            disabled={!canSubmit}
          />
        </form>
      ) : (
        <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Info className="mt-0.5 w-4 h-4 shrink-0 text-blue-500" />
          {t("googleOnlyNotice")}
        </p>
      )}
    </AccountCard>
  );
}

function PasswordField({
  label, value, onChange, autoComplete,
}: { label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  const t = useTranslations("account");
  const [revealed, setRevealed] = useState(false);

  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL_CLASS}>{label}</span>
      <div className="relative">
        <input
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          dir="ltr"
          className={`${FIELD_CLASS} w-full pe-10 text-start`}
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          tabIndex={-1}
          aria-label={revealed ? t("hidePassword") : t("showPassword")}
          className="absolute inset-e-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition-colors"
        >
          {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </label>
  );
}
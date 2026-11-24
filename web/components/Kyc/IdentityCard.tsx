"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useKycStatus, useStartKyc } from "@/hooks/kyc/useKyc";
import { canStartKyc, isKycPending } from "@/lib/kyc/kyc";
import { resolveAuthError } from "@/lib/auth/errors";
import AccountCard from "@/components/Account/AccountCard";
import KycBadge from "./KycBadge";

/** Account -> Identity: where a person verifies who they are, and sees the result. */
export default function IdentityCard() {
  const t = useTranslations("kyc");
  const tErrors = useTranslations("auth.errors");
  const { data: kyc, isLoading, refetch, isFetching } = useKycStatus();
  const start = useStartKyc();

  if (isLoading || !kyc) return null;

  const label = kyc.status === "NOT_STARTED" ? t("start") : kyc.status === "IN_PROGRESS" ? t("continue") : t("tryAgain");

  return (
    <AccountCard title={t("title")} description={t("description")}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <KycBadge status={kyc.status} />
          {kyc.required && !kyc.verified && (
            <span className="text-xs font-medium text-red-600 dark:text-red-400">{t("requiredHint")}</span>
          )}
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">{t(`explain.${kyc.status}`)}</p>
        {kyc.status === "DECLINED" && kyc.declineReason && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("reason", { reason: kyc.declineReason })}</p>
        )}
        {!kyc.providerConfigured && <p className="text-xs text-amber-700 dark:text-amber-300">{t("notConfigured")}</p>}

        {start.isError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{resolveAuthError(start.error, tErrors)}</p>
        )}

        <div className="flex flex-wrap gap-3">
          {canStartKyc(kyc.status) && kyc.providerConfigured && (
            <button
              type="button"
              onClick={() => start.mutate()}
              disabled={start.isPending}
              className="flex cursor-pointer items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {start.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {label}
            </button>
          )}
          {(isKycPending(kyc.status) || kyc.status === "NOT_STARTED") && (
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t("checkStatus")}
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">{t("privacy")}</p>
      </div>
    </AccountCard>
  );
}

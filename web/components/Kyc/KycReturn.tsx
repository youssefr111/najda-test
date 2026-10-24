"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useKycStatus } from "@/hooks/kyc/useKyc";
import { isKycPending } from "@/lib/kyc/kyc";

/** Where Didit sends the person back to. The URL carries hints only: the result shown is always the backend's. */
export default function KycReturn() {
  const t = useTranslations("kyc");
  const { data: kyc } = useKycStatus();

  const pending = !kyc || isKycPending(kyc.status) || kyc.status === "NOT_STARTED";
  const ok = kyc?.status === "VERIFIED";

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      {pending ? (
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" aria-hidden="true" />
      ) : ok ? (
        <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
      ) : (
        <XCircle className="h-10 w-10 text-red-600" aria-hidden="true" />
      )}

      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        {pending ? t("returnChecking") : ok ? t("returnVerified") : t("returnNotVerified")}
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {kyc ? t(`explain.${kyc.status}`) : t("returnChecking")}
      </p>
      {kyc?.status === "IN_REVIEW" && <p className="text-xs text-slate-500">{t("returnReviewHint")}</p>}

      <div className="flex flex-wrap justify-center gap-3">
        {ok && (
          <Link href="/emergency" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            {t("goToEmergency")}
          </Link>
        )}
        <Link href="/account" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          {t("backToAccount")}
        </Link>
      </div>
    </div>
  );
}

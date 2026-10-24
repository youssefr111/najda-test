"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useFlaggedCallers } from "@/hooks/incidents/useFlaggedCallers";
import { useToggleUserEnabled } from "@/hooks/users/useToggleUserEnabled";
import { relativeTime } from "@/lib/dispatch/format";

export default function FlaggedCallersPanel() {
  const t = useTranslations("callerHistory");
  const tCommon = useTranslations("common");
  const queryClient = useQueryClient();
  const { data: callers } = useFlaggedCallers();
  const toggleEnabled = useToggleUserEnabled();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  if (!callers || callers.length === 0) return null;

  const setEnabled = (userId: number, enabled: boolean) =>
    toggleEnabled.mutate({ userId, enabled }, {
      onSuccess: () => {
        setConfirmingId(null);
        queryClient.invalidateQueries({ queryKey: ["caller-flags"] });
      },
    });

  return (
    <details className="border-b border-slate-200 dark:border-slate-800 bg-amber-50/60 dark:bg-amber-950/20">
      <summary className="px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300 cursor-pointer select-none">
        {t("flaggedTitle", { count: callers.length })}
      </summary>
      <ul className="px-3 pb-3 flex flex-col gap-2">
        <li className="text-xs text-slate-500 dark:text-slate-400">{t("flaggedHint")}</li>
        {callers.map((caller) => (
          <li key={caller.userId} className="rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{caller.name}</p>
              {!caller.accountEnabled && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400">{t("suspended")}</span>
              )}
            </div>
            {caller.email && <p className="text-xs text-slate-500 dark:text-slate-400" dir="ltr">{caller.email}</p>}

            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {caller.falseReports > 0 && (
                <p className="font-medium">{t("flaggedFalseReports", { count: caller.falseReports, days: caller.falseReportWindowDays })}</p>
              )}
              <p>
                {t("flaggedCancellations", {
                  cancelled: caller.cancelledReports,
                  total: caller.totalReports,
                  days: caller.cancellationWindowDays,
                  afterDispatch: caller.cancelledAfterDispatch,
                })}
                {caller.lastCancelledAt && ` · ${t("lastCancelled", { when: relativeTime(caller.lastCancelledAt) })}`}
              </p>
            </div>

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {!caller.accountEnabled ? (
                <button type="button" onClick={() => setEnabled(caller.userId, true)} disabled={toggleEnabled.isPending} className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50">
                  {t("reenable")}
                </button>
              ) : confirmingId === caller.userId ? (
                <>
                  <span className="text-xs text-red-700 dark:text-red-300 flex-1">{t("suspendConfirm")}</span>
                  <button type="button" onClick={() => setEnabled(caller.userId, false)} disabled={toggleEnabled.isPending} className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-md cursor-pointer disabled:opacity-50">
                    {tCommon("confirm")}
                  </button>
                  <button type="button" onClick={() => setConfirmingId(null)} className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                    {tCommon("cancel")}
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmingId(caller.userId)} className="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer">
                  {t("suspend")}
                </button>
              )}
            </div>
          </li>
        ))}
        {toggleEnabled.isError && (
          <li className="text-xs text-red-600 dark:text-red-400">
            {toggleEnabled.error instanceof Error ? toggleEnabled.error.message : t("actionError")}
          </li>
        )}
      </ul>
    </details>
  );
}
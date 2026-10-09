"use client";

import { useTranslations } from "next-intl";
import { useCallerHistory } from "@/hooks/incidents/useCallerHistory";

/** Context for a human dispatcher or admin only -- deliberately never an input to priority or assignment. */
export default function CallerHistoryNotice({ incidentId }: { incidentId: number }) {
  const t = useTranslations("callerHistory");
  const { data } = useCallerHistory(incidentId);

  if (!data || (data.cancelledReports === 0 && data.falseReports === 0)) return null;

  return (
    <div className="flex flex-col gap-1 rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
      {data.falseReports > 0 && (
        <p className="font-medium">{t("falseReports", { count: data.falseReports, days: data.falseReportWindowDays })}</p>
      )}
      {data.cancelledReports > 0 && (
        <p>
          {t("summary", { days: data.cancellationWindowDays, cancelled: data.cancelledReports, total: data.totalReports })}
          {data.cancelledAfterDispatch > 0 && ` ${t("afterDispatch", { count: data.cancelledAfterDispatch })}`}
        </p>
      )}
    </div>
  );
}
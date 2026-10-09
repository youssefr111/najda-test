"use client";

import { useTranslations } from "next-intl";
import { cancellationCategoryLabel } from "@/lib/dispatch/format";
import type { Incident } from "@/types/incident";

interface CancellationNoticeProps {
  incident: Incident;
  /** Staff panels show the false-report details themselves, so they switch the generic notice off. */
  showFalseReport?: boolean;
}

export default function CancellationNotice({ incident, showFalseReport = true }: CancellationNoticeProps) {
  const t = useTranslations("cancelIncident");
  const tEnums = useTranslations("enums");

  if (incident.falseReportType) {
    if (!showFalseReport) return null;
    return (
      <div className="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm">
        <p className="font-medium text-red-700 dark:text-red-400">{t("closedAsFalseReport")}</p>
      </div>
    );
  }

  if (incident.status !== "CANCELLED" || !incident.cancellationCategory) return null;

  return (
    <div className="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm">
      <p className="font-medium text-red-700 dark:text-red-400">
        {t("cancelledNotice", { reason: cancellationCategoryLabel(tEnums, incident.cancellationCategory) })}
      </p>
      {incident.cancellationReason && <p className="mt-0.5 text-slate-700 dark:text-slate-300">{incident.cancellationReason}</p>}
    </div>
  );
}
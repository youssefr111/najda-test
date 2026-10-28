"use client";

import { useTranslations } from "next-intl";
import { UsersRound } from "lucide-react";
import type { ReportedFor } from "@/types/incident";

/**
 * "Reported for someone else": shown wherever responders and dispatch read a report, so the reporter's own
 * details are never taken for the patient's. Renders nothing for an ordinary (self) report.
 */
export default function ReportedForBadge({ reportedFor }: { reportedFor?: ReportedFor }) {
  const t = useTranslations("reportedFor");
  if (reportedFor !== "OTHER") return null;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
      <UsersRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
      <div>
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{t("badge")}</p>
        <p className="text-xs text-amber-800 dark:text-amber-200">{t("note")}</p>
      </div>
    </div>
  );
}

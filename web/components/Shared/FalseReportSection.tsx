"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useClearFalseReport } from "@/hooks/incidents/useClearFalseReport";
import { useMarkFalseReport } from "@/hooks/incidents/useMarkFalseReport";
import { falseReportTypeLabel, relativeTime } from "@/lib/dispatch/format";
import type { FalseReportType, Incident } from "@/types/incident";

const TYPES: FalseReportType[] = ["PRANK_OR_HOAX", "SPAM_OR_TEST", "MALICIOUS"];
const LIVE_STATUSES = ["NEW", "AI_PROCESSED", "DISPATCHER_REVIEW", "ASSIGNED", "IN_PROGRESS"];

interface FalseReportSectionProps {
  incident: Incident;
  /** Admins can undo a mark; dispatchers can only add one. */
  canClear: boolean;
}

export default function FalseReportSection({ incident, canClear }: FalseReportSectionProps) {
  const t = useTranslations("falseReport");
  const tEnums = useTranslations("enums");
  const tCommon = useTranslations("common");
  const markFalseReport = useMarkFalseReport();
  const clearFalseReport = useClearFalseReport();

  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FalseReportType | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  if (incident.falseReportType) {
    return (
      <div className="flex flex-col gap-1.5 rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm">
        <p className="font-medium text-red-700 dark:text-red-400">
          {t("marked", { type: falseReportTypeLabel(tEnums, incident.falseReportType) })}
        </p>
        {incident.falseReportMarkedAt && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{relativeTime(incident.falseReportMarkedAt)}</p>
        )}

        {canClear && (confirmingClear ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-red-700 dark:text-red-300 flex-1">{t("clearConfirm")}</span>
            <button
              type="button"
              onClick={() => clearFalseReport.mutate(incident.id, { onSuccess: () => setConfirmingClear(false) })}
              disabled={clearFalseReport.isPending}
              className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-md cursor-pointer disabled:opacity-50"
            >
              {tCommon("confirm")}
            </button>
            <button type="button" onClick={() => setConfirmingClear(false)} className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
              {tCommon("cancel")}
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmingClear(true)} className="self-start text-xs text-slate-600 dark:text-slate-300 hover:underline cursor-pointer">
            {t("clear")}
          </button>
        ))}

        {clearFalseReport.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {clearFalseReport.error instanceof Error ? clearFalseReport.error.message : t("error")}
          </p>
        )}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button type="button" onClick={() => setIsOpen(true)} className="self-start text-sm text-red-600 dark:text-red-400 hover:underline cursor-pointer">
        {t("open")}
      </button>
    );
  }

  const closesIncident = LIVE_STATUSES.includes(incident.status);

  function close() {
    setIsOpen(false);
    setType(null);
    markFalseReport.reset();
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-red-200 dark:border-red-900/60 p-4">
      <legend className="px-1 text-sm font-medium text-red-700 dark:text-red-400">{t("title")}</legend>

      <p className="text-xs text-amber-700 dark:text-amber-400">{closesIncident ? t("closesWarning") : t("recordOnlyWarning")}</p>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("typePrompt")}</p>
        {TYPES.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200 cursor-pointer">
            <input type="radio" name="false-report-type" checked={type === option} onChange={() => setType(option)} className="accent-red-600" />
            {falseReportTypeLabel(tEnums, option)}
          </label>
        ))}
      </div>

      {markFalseReport.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {markFalseReport.error instanceof Error ? markFalseReport.error.message : t("error")}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => type && markFalseReport.mutate({ incidentId: incident.id, type })}
          disabled={!type || markFalseReport.isPending}
          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md disabled:opacity-50 cursor-pointer"
        >
          {markFalseReport.isPending ? t("marking") : t("confirm")}
        </button>
        <button type="button" onClick={close} disabled={markFalseReport.isPending} className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 rounded-md border border-slate-300 dark:border-slate-700 cursor-pointer disabled:opacity-50">
          {tCommon("cancel")}
        </button>
      </div>
    </fieldset>
  );
}
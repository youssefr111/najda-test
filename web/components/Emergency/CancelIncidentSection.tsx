"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCancelIncident } from "@/hooks/incidents/useCancelIncident";
import { cancellationCategoryLabel } from "@/lib/dispatch/format";
import type { CancellationCategory } from "@/types/incident";

const CATEGORIES: CancellationCategory[] = [
  "SUBMITTED_BY_MISTAKE", "SITUATION_RESOLVED", "GOT_HELP_ELSEWHERE", "DUPLICATE_REPORT", "OTHER",
];
const MAX_DETAILS_LENGTH = 255;

interface CancelIncidentSectionProps {
  incidentId: number;
  /** A unit has accepted and is heading out -- warn that cancelling stands it down. */
  unitOnTheWay: boolean;
}

export default function CancelIncidentSection({ incidentId, unitOnTheWay }: CancelIncidentSectionProps) {
  const t = useTranslations("cancelIncident");
  const tEnums = useTranslations("enums");
  const cancelIncident = useCancelIncident();

  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<CancellationCategory | null>(null);
  const [details, setDetails] = useState("");

  const needsDetails = category === "OTHER";
  const canSubmit = category !== null && (!needsDetails || details.trim() !== "") && !cancelIncident.isPending;

  function close() {
    setIsOpen(false);
    setCategory(null);
    setDetails("");
    cancelIncident.reset();
  }

  function handleSubmit() {
    if (!category) return;
    cancelIncident.mutate({ incidentId, category, details: details.trim() || undefined });
  }

  if (!isOpen) {
    return (
      <button type="button" onClick={() => setIsOpen(true)} className="self-start text-sm text-red-600 dark:text-red-400 hover:underline cursor-pointer">
        {t("open")}
      </button>
    );
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-red-200 dark:border-red-900/60 p-4">
      <legend className="px-1 text-sm font-medium text-red-700 dark:text-red-400">{t("title")}</legend>

      {unitOnTheWay && <p className="text-xs text-amber-700 dark:text-amber-400">{t("unitOnTheWay")}</p>}

      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("reasonPrompt")}</p>
        {CATEGORIES.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200 cursor-pointer">
            <input
              type="radio"
              name="cancellation-category"
              checked={category === option}
              onChange={() => setCategory(option)}
              className="accent-red-600"
            />
            {cancellationCategoryLabel(tEnums, option)}
          </label>
        ))}
      </div>

      {category && (
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={MAX_DETAILS_LENGTH}
          rows={2}
          placeholder={needsDetails ? t("detailsRequired") : t("detailsOptional")}
          className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
        />
      )}

      {cancelIncident.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {cancelIncident.error instanceof Error ? cancelIncident.error.message : t("error")}
        </p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md disabled:opacity-50 cursor-pointer">
          {cancelIncident.isPending ? t("cancelling") : t("confirm")}
        </button>
        <button type="button" onClick={close} disabled={cancelIncident.isPending} className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 rounded-md border border-slate-300 dark:border-slate-700 cursor-pointer disabled:opacity-50">
          {t("keep")}
        </button>
      </div>
    </fieldset>
  );
}
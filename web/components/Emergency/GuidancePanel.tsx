"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, HeartPulse, TriangleAlert } from "lucide-react";
import { useGuidance } from "@/hooks/guidance/useGuidance";
import { cardsFor, resolveText } from "@/lib/guidance/content";
import type { IncidentCategory } from "@/types/incident";

interface GuidancePanelProps {
  category: IncidentCategory;
  injuredCount: number;
}

/** "Until help arrives" tips for the citizen, written and translated by admins in the dashboard. */
export default function GuidancePanel({ category, injuredCount }: GuidancePanelProps) {
  const t = useTranslations("guidance");
  const locale = useLocale();
  const { data, isError } = useGuidance();

  if (!data) {
    return isError ? <p className="text-xs text-slate-500 dark:text-slate-400">{t("unavailable")}</p> : null;
  }

  const cards = cardsFor(data.content, category, injuredCount);
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby="guidance-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="guidance-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <HeartPulse className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          {t("title")}
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{resolveText(data.content.disclaimer, locale)}</p>
      </div>

      <div className="flex flex-col gap-2">
        {cards.map((card) => (
          <details
            key={card.id}
            open={card.general}
            className="group rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
              {resolveText(card.title, locale)}
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="flex flex-col gap-3 border-t border-slate-100 px-3 py-3 dark:border-slate-800">
              <ol className="flex flex-col gap-2">
                {card.steps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <span>{resolveText(step, locale)}</span>
                  </li>
                ))}
              </ol>
              {card.warning && (
                <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    <span className="font-semibold">{t("important")}: </span>
                    {resolveText(card.warning, locale)}
                  </span>
                </p>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

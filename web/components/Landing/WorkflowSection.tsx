"use client";

import { useTranslations } from "next-intl";

const STEP_KEYS = ["step1", "step2", "step3", "step4"] as const;

export default function WorkflowSection() {
  const t = useTranslations("landing.workflow");

  return (
    <section id="workflow" className="bg-white dark:bg-slate-900 py-16 sm:py-24 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-600 dark:text-red-400">{t("eyebrow")}</p>
          <h2 className="mt-4 sm:mt-5 text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white">
            {t("titleLine1")}
            <br />
            {t("titleLine2")}
          </h2>
          <p className="mx-auto mt-4 sm:mt-6 max-w-3xl text-base sm:text-lg text-slate-600 dark:text-slate-300">{t("description")}</p>
        </div>

        <div className="mt-12 sm:mt-16 grid gap-6 sm:gap-8 sm:grid-cols-2 xl:grid-cols-4">
          {STEP_KEYS.map((key, i) => (
            <div key={key} className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 sm:p-8 shadow-sm transition duration-300 hover:-translate-y-2 hover:border-red-500 hover:shadow-xl flex flex-col justify-between">
              <div>
                <div className="text-red-600 dark:text-red-400 text-xs sm:text-sm font-bold tracking-[0.3em] text-start">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="mt-3 sm:mt-4 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t(`${key}Title`)}</h3>
                <p className="mt-3 sm:mt-5 text-sm sm:text-base leading-6 sm:leading-7 text-slate-600 dark:text-slate-300">{t(`${key}Body`)}</p>
              </div>
              <div className="mt-6 sm:mt-8 h-1 w-0 rounded-full bg-red-600 transition-all duration-300 group-hover:w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
"use client";

import { useTranslations } from "next-intl";

const FEATURE_KEYS = ["feature1", "feature2", "feature3", "feature4"] as const;
const ICONS = ["⚡", "📍", "🧠", "🔐"];

export default function FeaturesSection() {
  const t = useTranslations("landing.features");

  return (
    <section id="platform" className="bg-white dark:bg-slate-900 py-16 sm:py-24 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-600 dark:text-red-400">{t("eyebrow")}</p>
          <h2 className="mt-3 sm:mt-4 text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white">{t("title")}</h2>
          <p className="mx-auto mt-4 sm:mt-6 max-w-3xl text-base sm:text-lg text-slate-600 dark:text-slate-300">{t("description")}</p>
        </div>

        <div className="mt-12 sm:mt-16 grid gap-6 sm:gap-8 md:grid-cols-2">
          {FEATURE_KEYS.map((key, i) => (
            <div key={key} className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 sm:p-8 transition-all duration-300 hover:-translate-y-2 hover:border-red-500 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl">
              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950/50 text-2xl sm:text-3xl">{ICONS[i]}</div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t(`${key}Title`)}</h3>
                  <p className="mt-3 sm:mt-4 text-sm sm:text-base leading-6 sm:leading-7 text-slate-600 dark:text-slate-300">{t(`${key}Body`)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
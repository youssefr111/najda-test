"use client";

import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { LANGUAGES } from "@/lib/locale/languages";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
      <div className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-7 flex flex-col gap-3">{children}</div>
    </div>
  );
}

export default function TermsPage() {
  const t = useTranslations("legal.terms");
  const locale = useLocale();
  const dir = LANGUAGES.find(l => l.id === locale)?.dir ?? "ltr";

  return (
    <main className="bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors" dir={dir}>
      <section className="bg-slate-950 text-white py-14 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-400">{t("eyebrow")}</p>
          <h1 className="mt-4 text-3xl sm:text-5xl font-bold">{t("title")}</h1>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-5">
        <div className="rounded-2xl border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-bold text-red-800 dark:text-red-300 mb-2">{t("simulationTitle")}</h2>
          <p className="text-sm sm:text-base text-red-700 dark:text-red-300 leading-7">{t("simulationBody")}</p>
        </div>

        <Section title={t("acceptableUseTitle")}><p>{t("acceptableUseBody")}</p></Section>
        <Section title={t("accountsTitle")}><p>{t("accountsBody")}</p></Section>
        <Section title={t("applicationsTitle")}><p>{t("applicationsBody")}</p></Section>
        <Section title={t("warrantyTitle")}><p>{t("warrantyBody")}</p></Section>
        <Section title={t("contactTitle")}>
          <p>{t.rich("contactBody", { support: (chunks) => <Link href="/support" className="text-blue-600 dark:text-blue-400 hover:underline">{chunks}</Link> })}</p>
        </Section>
      </section>
    </main>
  );
}
"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LANGUAGES } from "@/lib/locale/languages";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
      <div className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-7 flex flex-col gap-3">{children}</div>
    </div>
  );
}

export default function PrivacyPage() {
  const t = useTranslations("legal.privacy");
  const locale = useLocale();
  const dir = LANGUAGES.find(l => l.id === locale)?.dir ?? "ltr";

  return (
    <main className="bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors" dir={dir}>
      <section className="bg-slate-950 text-white py-14 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-400">{t("eyebrow")}</p>
          <h1 className="mt-4 text-3xl sm:text-5xl font-bold">{t("title")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">{t("subtitle")}</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col gap-5">
        <Section title={t("collectTitle")}>
          <ul className="list-disc ps-5 flex flex-col gap-1.5">
            <li>{t("accountInfo")}</li>
            <li>{t("locationData")}</li>
            <li>{t("mediaData")}</li>
            <li>{t("usageData")}</li>
          </ul>
        </Section>

        <Section title={t("usedTitle")}>
          <p>{t("usedBody1")}</p>
          <p>{t("usedBody2")}</p>
        </Section>

        <Section title={t("storedTitle")}><p>{t("storedBody")}</p></Section>
        <Section title={t("thirdPartiesTitle")}><p>{t("thirdPartiesBody")}</p></Section>
        <Section title={t("dontTitle")}><p>{t("dontBody")}</p></Section>
        <Section title={t("contactTitle")}>
          <p>{t.rich("contactBody", { support: (chunks) => <Link href="/support" className="text-blue-600 dark:text-blue-400 hover:underline">{chunks}</Link> })}</p>
        </Section>
      </section>
    </main>
  );
}
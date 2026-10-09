"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function BecomeResponderSection() {
  const t = useTranslations("landing.becomeResponder");

  return (
    <section id="become-responder" className="bg-slate-100 dark:bg-slate-900 py-16 sm:py-24 transition-colors duration-300">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-600 dark:text-red-400">{t("eyebrow")}</p>
        <h2 className="mt-3 sm:mt-4 text-3xl sm:text-5xl font-bold text-slate-900 dark:text-white">{t("title")}</h2>
        <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-slate-600 dark:text-slate-300">{t("description")}</p>
        <Link href="/become-a-responder" className="mt-8 inline-block rounded-lg bg-red-600 px-8 py-4 font-semibold text-white shadow-md transition hover:bg-red-500">
          {t("applyNow")}
        </Link>
      </div>
    </section>
  );
}
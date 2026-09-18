import { LANGUAGES } from "@/lib/locale/languages";
import { useLocale, useTranslations } from "next-intl";

export default function AboutPage() {
  const t = useTranslations("about");
  const locale = useLocale();
  const dir = LANGUAGES.find(l => l.id === locale)?.dir ?? "ltr";

  return (
    <main className="bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors" dir={dir}>
      <section className="bg-slate-950 text-white py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-400">{t("label")}</p>
          <h1 className="mt-4 text-3xl sm:text-5xl font-bold">{t("title")}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-300 leading-7 sm:leading-8">
            {t("description")}
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex flex-col gap-10">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">{t("sectionTitle")}</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-7">
            {t("sectionDescription")}
          </p>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">{t("sectionTitle2")}</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-7">
            {t("sectionDescription2")}
          </p>
        </div>
      </section>
    </main>
  );
}
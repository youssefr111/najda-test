import { useTranslations } from "next-intl";
import { BrainCircuit, MapPin, ShieldCheck, Zap, type LucideIcon } from "lucide-react";

const FEATURES: { key: "feature1" | "feature2" | "feature3" | "feature4"; Icon: LucideIcon }[] = [
  { key: "feature1", Icon: Zap },
  { key: "feature2", Icon: MapPin },
  { key: "feature3", Icon: BrainCircuit },
  { key: "feature4", Icon: ShieldCheck },
];

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
          {FEATURES.map(({ key, Icon }, index) => (
            <article
              key={key}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 sm:p-8 transition-all duration-300 motion-safe:hover:-translate-y-1 hover:border-red-500/60 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xl hover:shadow-red-500/5"
            >
              {/* Accent line that fades in on hover */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-transparent via-red-500 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />

              {/* Step number: never mirrored, so it gets an explicit ltr */}
              <span
                aria-hidden="true"
                dir="ltr"
                className="absolute inset-e-6 top-5 select-none text-sm font-semibold tabular-nums text-slate-300 dark:text-slate-700"
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 ring-1 ring-red-200/70 dark:ring-red-900/60 transition-colors duration-300 group-hover:bg-red-600 group-hover:text-white group-hover:ring-red-600">
                  <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
                </div>

                <div className="pe-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t(`${key}Title`)}</h3>
                  <p className="mt-3 sm:mt-4 text-sm sm:text-base leading-6 sm:leading-7 text-slate-600 dark:text-slate-300">{t(`${key}Body`)}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
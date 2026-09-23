"use client";

import { useTranslations } from "next-intl";
import { FaGooglePlay  } from "react-icons/fa";
import { SiAppstore } from "react-icons/si";

const ANDROID_DOWNLOAD_URL = "https://github.com/youssefry01/najda/releases/latest/download/najda-latest.apk";
const IOS_DOWNLOAD_URL = "#app-download";
const RELEASES_PAGE_URL = "https://github.com/youssefry01/najda/releases/latest";

export default function AppDownloadSection() {
  const t = useTranslations("landing.appDownload");

  return (
    <section id="app-download" className="bg-slate-950 py-16 sm:py-24 transition-colors duration-300">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-red-600 to-red-800 px-6 py-14 sm:px-16 sm:py-20 text-center shadow-xl">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-100">
              {t("eyebrow")}
            </p>
            <h2 className="mt-3 sm:mt-4 text-3xl sm:text-5xl font-bold text-white">
              {t("title")}
            </h2>
            <p className="mx-auto mt-4 sm:mt-6 max-w-xl text-base sm:text-lg text-red-50">
              {t("description")}
            </p>

            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={IOS_DOWNLOAD_URL}
                className="flex w-64 sm:w-auto items-center gap-3 rounded-xl bg-black/90 px-6 py-3 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-black"
              >
                <SiAppstore className="h-7 w-7 text-white shrink-0" />
                <span className="flex flex-col items-start leading-tight text-white">
                  <span className="text-[11px] text-slate-300">{t("downloadOn")}</span>
                  <span className="text-lg font-semibold">App Store</span>
                </span>
              </a>
              
              <a
                href={ANDROID_DOWNLOAD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-64 sm:w-auto items-center gap-3 rounded-xl bg-black/90 px-6 py-3 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:bg-black"
              >
                <FaGooglePlay className="h-7 w-7 text-white shrink-0" />
                <span className="flex flex-col items-start leading-tight text-white">
                  <span className="text-[11px] text-slate-300">{t("getItOn")}</span>
                  <span className="text-lg font-semibold">Google Play</span>
                </span>
              </a>
            </div>

            <div className="mt-2 sm:mt-4">
                <a
                    href={RELEASES_PAGE_URL}
                    className="text-xs font-medium text-red-100 underline underline-offset-4 transition hover:text-white"
                >
                {t("viewReleases")}
            </a>
            </div>

            <p className="mt-6 text-xs sm:text-sm text-red-50">{t("note")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
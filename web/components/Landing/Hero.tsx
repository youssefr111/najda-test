/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { Smartphone, ShieldCheck, MapPin, HeartPulse} from "lucide-react";
import { useTranslations } from "next-intl";
import type { User } from "@/types/user";

export default function Hero({ user }: { user: User | null }) {
  const t = useTranslations("landing.hero");

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-87.5 w-87.5 sm:h-125 sm:w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-700/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-64 w-64 sm:h-96 sm:w-96 rounded-full bg-red-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-16 px-4 sm:px-6 py-20 lg:flex-row lg:py-36">
        <div className="flex-1 w-full text-center lg:text-start">
          <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 sm:px-4 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-300">
            {t("badge")}
          </span>

          <h1 className="mt-6 text-4xl sm:text-5xl md:text-7xl font-bold leading-tight">
            {t("titleLine1")}
            <br />
            <span className="text-red-500">{t("titleLine2")}</span>
          </h1>

          <p className="mt-6 sm:mt-8 max-w-2xl mx-auto lg:mx-0 text-base sm:text-lg leading-7 sm:leading-8 text-slate-300">
            {t("description1")}
          </p>
          <p className="mt-4 sm:mt-6 max-w-2xl mx-auto lg:mx-0 text-sm sm:text-base text-slate-400 leading-6 sm:leading-7">
            {t("description2")}
          </p>

          <div className="mt-8 sm:mt-10 flex flex-wrap justify-center lg:justify-start gap-4">
            {user ? (
              <Link href="/emergency" className="w-full sm:w-auto text-center rounded-lg bg-red-600 px-8 py-4 font-semibold transition hover:bg-red-500 text-white shadow-md">
                {t("callEmergency")}
              </Link>
            ) : (
              <Link href="/login" className="w-full sm:w-auto text-center rounded-lg bg-red-600 px-8 py-4 font-semibold transition hover:bg-red-500 text-white shadow-md">
                {t("login")}
              </Link>
            )}
            <a href="#workflow" className="w-full sm:w-auto text-center rounded-lg border border-slate-700 bg-slate-800/50 px-8 py-4 font-semibold transition hover:bg-slate-800 text-white">
              {t("exploreWorkflow")}
            </a>
          </div>

          <a
            href="#app-download"
            className="mt-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <Smartphone className="h-4 w-4" />
            {t("getApp")}
          </a>
        </div>

        <div className="flex-1 w-full flex items-center justify-center py-10 lg:py-0">
          <div className="relative h-72 w-72 sm:h-96 sm:w-96 lg:h-112 lg:w-md">
            <div className="absolute inset-0 rounded-full bg-red-600/20 blur-[90px]" />

            <div className="absolute inset-0 rounded-full border border-slate-800" />
            <div className="absolute inset-8 sm:inset-10 rounded-full border border-slate-800/70" />
            <div className="absolute inset-16 sm:inset-20 rounded-full border border-slate-800/50" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-[1.75rem] bg-linear-to-br shadow-[0_0_70px_rgba(220,38,38,0.5)]">
                <img src="/logo6.png" alt="NAJDA" className="h-18 w-18 filter brightness-200"/>
              </div>
            </div>

            <div className="absolute -top-2 -left-6 sm:-left-10 flex h-16 w-16 sm:h-20 sm:w-20 rotate-[-10deg] items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-900/70 shadow-xl backdrop-blur-xl">
              <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8 text-red-400" />
            </div>

            <div className="absolute top-1/3 -right-6 sm:-right-12 flex h-16 w-16 sm:h-20 sm:w-20 rotate-[8deg] items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-900/70 shadow-xl backdrop-blur-xl">
              <HeartPulse className="h-7 w-7 sm:h-8 sm:w-8 text-red-400" />
            </div>

            <div className="absolute -bottom-4 left-1/4 sm:left-10 flex h-16 w-16 sm:h-20 sm:w-20 rotate-6 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-900/70 shadow-xl backdrop-blur-xl">
              <MapPin className="h-7 w-7 sm:h-8 sm:w-8 text-red-400" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { User } from "@/types/user";

const ORBIT_ROLE_KEYS = ["CITIZEN", "DISPATCHER", "AMBULANCE_CREW", "POLICE", "FIREFIGHTER", "FIRST_RESPONDER", "HOSPITAL_STAFF"] as const;

export default function Hero({ user }: { user: User | null }) {
  const t = useTranslations("landing.hero");
  const tRoles = useTranslations("enums.role");

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
        </div>

        <div className="relative flex flex-1 w-full justify-center py-10 lg:py-0">
          <div className="relative w-70 h-70 sm:w-95 sm:h-95 lg:w-125 lg:h-125 max-w-full rounded-full border border-red-500/20 flex items-center justify-center">
            <div className="absolute inset-8 sm:inset-12 rounded-full border border-red-500/20" />
            <div className="absolute inset-16 sm:inset-24 rounded-full border border-red-500/20" />
            <div className="absolute h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-red-600 shadow-[0_0_30px_#dc2626]" />

            {ORBIT_ROLE_KEYS.map((roleKey, i) => {
              const angle = (i / ORBIT_ROLE_KEYS.length) * 2 * Math.PI;
              const radiusPercent = 38;
              const x = 50 + radiusPercent * Math.cos(angle);
              const y = 50 + radiusPercent * Math.sin(angle);
              return (
                <div key={roleKey} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}>
                  <div className="rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm shadow-xl backdrop-blur whitespace-nowrap text-white font-medium">
                    {tRoles(roleKey)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="absolute -bottom-10 sm:-bottom-16 inset-s-4 sm:inset-s-6 rounded-2xl border border-slate-700 bg-slate-800/95 p-4 sm:p-6 backdrop-blur shadow-xl">
            <p className="text-[10px] sm:text-xs uppercase tracking-widest text-slate-400">{t("liveSyncLabel")}</p>
            {/* "<100ms" stays as literal digits -- a metric value, not
                translatable content, and Western numerals stay legible in
                both languages for exactly this kind of data. */}
            <div className="mt-1 sm:mt-2 text-3xl sm:text-4xl font-bold text-red-500 text-start">&lt;100ms</div>
            <p className="text-xs sm:text-sm text-slate-400">{t("liveSyncCaption")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
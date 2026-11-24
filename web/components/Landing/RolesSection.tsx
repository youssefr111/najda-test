"use client";

import { useTranslations } from "next-intl";
import { ROLE_CONFIG } from "@/lib/auth/roles";

export default function RolesSection() {
  const t = useTranslations("landing.roles");
  const tRoles = useTranslations("enums.role");
  const roleKeys = Object.keys(ROLE_CONFIG) as Array<keyof typeof ROLE_CONFIG>;

  return (
    <section id="roles" className="bg-slate-950 py-16 sm:py-24 text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-red-400">{t("eyebrow")}</p>
          <h2 className="mt-4 sm:mt-5 text-3xl sm:text-5xl font-bold">
            {t("titleLine1")}
            <br />
            {t("titleLine2")}
          </h2>
          <p className="mx-auto mt-4 sm:mt-6 max-w-3xl text-base sm:text-lg leading-7 sm:leading-8 text-slate-300">{t("description")}</p>
        </div>

        <div className="mt-12 sm:mt-16 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {roleKeys.map((role) => (
            <div key={role} className="rounded-2xl border border-slate-700 bg-slate-800/80 p-5 sm:p-6 backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:border-red-500 hover:bg-slate-800 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-white">{tRoles(role)}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
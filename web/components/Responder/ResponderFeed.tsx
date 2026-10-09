"use client";

import { useTranslations, useLocale } from "next-intl";
import { LANGUAGES } from "@/lib/locale/languages";
import { useMyShift } from "@/hooks/shifts/useMyShift";
import ShiftStatusCard from "./ShiftStatusCard";
import CrewList from "./CrewList";
import MyMissionsPanel from "./MyMissionsPanel";
import type { User } from "@/types/user";

export default function ResponderFeed({ user }: { user: User }) {
  const locale = useLocale();
  const dir = LANGUAGES.find(l => l.id === locale)?.dir ?? "ltr";

  const t = useTranslations("responderFeed");
  const tRole = useTranslations("enums.role");
  const { data: shift } = useMyShift();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6" dir={dir}>
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">{user.firstName} {user.lastName}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{tRole(user.roleName)}</p>
        {user?.facilityName && <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{user.facilityName}</p>}
      </div>
      
      <ShiftStatusCard />
      {shift && <CrewList unitId={shift.unitId} />}

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t("missions")}</p>
        <MyMissionsPanel />
      </div>
    </div>
  );
}
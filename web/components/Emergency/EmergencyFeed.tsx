"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { User } from "@/types/user";
import SosPanel from "./SosPanel";
import EmergencyConfirmation from "./EmergencyConfirmation";
import MyActiveIncidentPanel from "./MyActiveIncidentPanel";
import { useMyIncidents } from "@/hooks/incidents/useMyIncidents";
import { categoryLabel, incidentStatusLabel, relativeTime } from "@/lib/dispatch/format";
import { LANGUAGES } from "@/lib/locale/languages";

const ACTIVE_STATUSES = ["NEW", "AI_PROCESSED", "DISPATCHER_REVIEW", "ASSIGNED", "IN_PROGRESS"];
const PAST_STATUSES = ["RESOLVED", "CANCELLED"];

export default function EmergencyFeed({ user }: { user: User | null }) {
  const t = useTranslations("emergencyFeed");
  const tEnums = useTranslations("enums");
  const { data: myIncidents } = useMyIncidents();
  const activeIncident = myIncidents?.find((i) => ACTIVE_STATUSES.includes(i.status));
  const pastIncidents = (myIncidents ?? []).filter((i) => PAST_STATUSES.includes(i.status));
  const [emergencyStage, setEmergencyStage] = useState<'initial' | 'confirmation'>('initial');

  const locale = useLocale();
  const dir = LANGUAGES.find(l => l.id === locale)?.dir ?? "ltr";

  return (
    <div className="bg-white dark:bg-slate-950 md:py-8 transition-colors" dir={dir}>
      <div className="flex flex-col w-full mx-auto my-4 lg:my-0 max-w-5xl px-4 2xl:px-0">
        <div className="min-h-screen w-full bg-white dark:bg-[#0d0d0e] flex flex-col transition-colors">
          {activeIncident ? (
            <MyActiveIncidentPanel incident={activeIncident} />
          ) : (
            <>
              {emergencyStage === 'initial' && <SosPanel setEmergencyStage={setEmergencyStage} />}
              {emergencyStage === 'confirmation' && <EmergencyConfirmation user={user} setEmergencyStage={setEmergencyStage} />}
            </>
          )}

          {!activeIncident && pastIncidents.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t("pastEmergencies")}</p>
              <div className="flex flex-col gap-1.5">
                {pastIncidents.map((i) => (
                  <Link
                    key={i.id}
                    href={`/incidents/${i.id}`}
                    className="flex items-center justify-between px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="text-slate-900 dark:text-slate-100">#{i.id} — {categoryLabel(tEnums, i.category)}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{incidentStatusLabel(tEnums, i.status)} · {relativeTime(i.createdAt)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
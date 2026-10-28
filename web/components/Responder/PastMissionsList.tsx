"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMyMissions } from "@/hooks/missions/useMyMissions";
import { MISSION_STATUS_BADGE, cancellationCategoryLabel, missionStatusLabel, unitTypeLabel } from "@/lib/dispatch/format";

const PAST_STATUSES = ["COMPLETED", "REJECTED", "CANCELLED"];

export default function PastMissionsList() {
  const t = useTranslations("pastMissionsList");
  const tIncident = useTranslations("incidentDetail");
  const tEnums = useTranslations("enums");
  const tCancel = useTranslations("cancelIncident");
  const { data: missions } = useMyMissions();
  const past = (missions ?? []).filter((m) => PAST_STATUSES.includes(m.status));

  if (past.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t("title")}</p>
      <div className="flex flex-col gap-1.5">
        {past.map((m) => (
          <Link
            key={m.id}
            href={`/incidents/${m.incidentId}`}
            className="flex items-center justify-between px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
          >
            <span className="text-slate-900 dark:text-slate-100">
              {tIncident("incidentLabel", { id: m.incidentId })} · {unitTypeLabel(tEnums, m.unitType)}
              {m.status === "CANCELLED" && m.incidentCancellationCategory && (
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {tCancel("cancelledNotice", { reason: cancellationCategoryLabel(tEnums, m.incidentCancellationCategory) })}
                </span>
              )}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MISSION_STATUS_BADGE[m.status]}`}>{missionStatusLabel(tEnums, m.status)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useIncidentMissions } from "@/hooks/missions/useIncidentMissions";
import { useCancelMission } from "@/hooks/missions/useCancelMission";
import { MISSION_STATUS_BADGE, unitTypeLabel, missionStatusLabel } from "@/lib/dispatch/format";

const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "REJECTED"];

export default function MissionStatusList({ incidentId }: { incidentId: number }) {
  const t = useTranslations("missionList");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const { data: missions, isLoading } = useIncidentMissions(incidentId);
  const cancelMission = useCancelMission();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>;
  if (!missions || missions.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t("noUnits")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {missions.map((mission) => {
        const canCancel = !TERMINAL_STATUSES.includes(mission.status);
        return (
          <div key={mission.id} className="p-2.5 rounded-md border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {mission.unitPlateNumber} · {unitTypeLabel(tEnums, mission.unitType)}
              </p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MISSION_STATUS_BADGE[mission.status]}`}>
                {missionStatusLabel(tEnums, mission.status)}
              </span>
            </div>
            {mission.participantNames.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{mission.participantNames.join(", ")}</p>
            )}

            {canCancel && (
              confirmingId === mission.id ? (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-red-600 dark:text-red-400 flex-1">{t("cancelPrompt")}</span>
                  <button
                    onClick={() => cancelMission.mutate(mission.id, { onSuccess: () => setConfirmingId(null) })}
                    disabled={cancelMission.isPending}
                    className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-md disabled:opacity-50"
                  >
                    {cancelMission.isPending ? "…" : tCommon("confirm")}
                  </button>
                  <button onClick={() => setConfirmingId(null)} className="text-xs text-slate-500 dark:text-slate-400">{tCommon("cancel")}</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmingId(mission.id)} className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline">
                  {t("cancelAssignment")}
                </button>
              )
            )}
          </div>
        );
      })}
      {cancelMission.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">{cancelMission.error instanceof Error ? cancelMission.error.message : t("cancelError")}</p>
      )}
    </div>
  );
}
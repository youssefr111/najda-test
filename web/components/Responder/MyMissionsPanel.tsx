"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMyMissions } from "@/hooks/missions/useMyMissions";
import { useCompleteMission } from "@/hooks/missions/useCompleteMission";
import { useAcceptMission, useRejectMission, useMarkEnRoute, useMarkArrived } from "@/hooks/missions/useMissionActions";
import { useWithdrawMission } from "@/hooks/missions/useWithdrawMission";
import { MISSION_STATUS_BADGE, missionStatusLabel } from "@/lib/dispatch/format";
import HospitalTransferPanel from "./HospitalTransferPanel";
import MyMissionDetail from "./MyMissionDetail";
import PastMissionsList from "./PastMissionsList";

export default function MyMissionsPanel() {
  const t = useTranslations("myMissionsPanel");
  const tCommon = useTranslations("common");
  const tIncident = useTranslations("incidentDetail");
  const tEnums = useTranslations("enums");
  const { data: missions, isLoading } = useMyMissions();
  const completeMission = useCompleteMission();
  const acceptMission = useAcceptMission();
  const rejectMission = useRejectMission();
  const markEnRoute = useMarkEnRoute();
  const markArrived = useMarkArrived();
  const withdrawMission = useWithdrawMission();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [confirmingWithdrawId, setConfirmingWithdrawId] = useState<number | null>(null);

  if (isLoading) return <p className="text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>;

  const offered = missions?.filter((m) => m.status === "OFFERED") ?? [];
  const active = missions?.filter((m) => m.status === "ACCEPTED" || m.status === "EN_ROUTE" || m.status === "ARRIVED") ?? [];

  return (
    <div className="flex flex-col gap-4">
      {offered.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t("pendingRespond")}</p>
          {offered.map((m) => (
            <div key={m.id} className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 rounded-xl p-4 flex items-center justify-between gap-3 mb-2">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{tIncident("incidentLabel", { id: m.incidentId })}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MISSION_STATUS_BADGE[m.status]}`}>{missionStatusLabel(tEnums, m.status)}</span>
              </div>
              <div className="flex gap-2">
                {rejectingId === m.id ? (
                  <>
                    <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100" />
                    <button onClick={() => rejectMission.mutate({ missionId: m.id, reason }, { onSuccess: () => setRejectingId(null) })} className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md">{tCommon("confirm")}</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => acceptMission.mutate(m.id)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700">{t("accept")}</button>
                    <button onClick={() => setRejectingId(m.id)} className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-md">{t("reject")}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {active.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t("active")}</p>
          {active.map((m) => (
            <div key={m.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{tIncident("incidentLabel", { id: m.incidentId })}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MISSION_STATUS_BADGE[m.status]}`}>{missionStatusLabel(tEnums, m.status)}</span>
                </div>
                <div className="flex gap-2">
                  {m.status === "ACCEPTED" && <button onClick={() => markEnRoute.mutate(m.id)} className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-md">{t("markEnRoute")}</button>}
                  {m.status === "EN_ROUTE" && <button onClick={() => markArrived.mutate(m.id)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md">{t("markArrived")}</button>}
                  {m.status === "ARRIVED" && m.unitType !== "AMBULANCE" && (
                    <button onClick={() => completeMission.mutate(m.id)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md">{t("complete")}</button>
                  )}
                  {(m.status === "ACCEPTED" || m.status === "EN_ROUTE") && (
                    confirmingWithdrawId === m.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-red-600 dark:text-red-400">{t("withdrawConfirm")}</span>
                        <button onClick={() => withdrawMission.mutate(m.id, { onSuccess: () => setConfirmingWithdrawId(null) })} disabled={withdrawMission.isPending} className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-md disabled:opacity-50">
                          {withdrawMission.isPending ? "…" : tCommon("confirm")}
                        </button>
                        <button onClick={() => setConfirmingWithdrawId(null)} className="text-xs text-slate-500 dark:text-slate-400">{tIncident("noMessage") ? "" : ""}{tCommon("cancel")}</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmingWithdrawId(m.id)} className="px-3 py-1.5 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-medium rounded-md">
                        {t("withdraw")}
                      </button>
                    )
                  )}
                </div>
              </div>

              <MyMissionDetail mission={m} />

              {m.status === "ARRIVED" && m.unitType === "AMBULANCE" && (
                <div className="mt-3">
                  <HospitalTransferPanel mission={m} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {offered.length === 0 && active.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t("noMissions")}</p>}
      {withdrawMission.isError && <p className="text-xs text-red-600 dark:text-red-400">{withdrawMission.error instanceof Error ? withdrawMission.error.message : t("withdrawError")}</p>}

      <PastMissionsList />
    </div>
  );
}
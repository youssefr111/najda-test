"use client";

import { useTranslations } from "next-intl";
import { useMyShift } from "@/hooks/shifts/useMyShift";
import { useMyFacilityUnits } from "@/hooks/units/useMyFacilityUnits";
import { useStartShift, useJoinShift, useLeaveShift, useEndShift } from "@/hooks/shifts/useShiftActions";
import useAuth from "@/hooks/auth/useAuth";
import { useReportUnitLocation } from "@/hooks/units/useReportUnitLocation";

function LocationStatusBadge({ status, lastUpdatedAt, t }: { status: string; lastUpdatedAt: Date | null; t: ReturnType<typeof useTranslations<"shiftStatusCard">> }) {
  if (status === "watching" && lastUpdatedAt) {
    return <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> {t("live", { time: lastUpdatedAt.toLocaleTimeString() })}</span>;
  }
  if (status === "watching") return <span className="text-slate-400">{t("waitingGps")}</span>;
  if (status === "denied") return <span className="text-amber-600 dark:text-amber-400">{t("locationDenied")}</span>;
  if (status === "unsupported") return <span className="text-slate-400">{t("locationUnsupported")}</span>;
  if (status === "error") return <span className="text-red-600 dark:text-red-400">{t("locationError")}</span>;
  return <span className="text-slate-400">{t("locationPaused")}</span>;
}

export default function ShiftStatusCard() {
  const t = useTranslations("shiftStatusCard");
  const tCommon = useTranslations("common");
  const tShiftRole = useTranslations("enums.shiftRole");
  const { user } = useAuth();
  const { data: shift, isLoading } = useMyShift();
  const { data: units } = useMyFacilityUnits();
  const locationSharing = useReportUnitLocation(shift?.roleInShift === "LEAD" ? shift.unitId : null);
  const startShift = useStartShift();
  const joinShift = useJoinShift();
  const leaveShift = useLeaveShift();
  const endShift = useEndShift();

  const startCandidates = (units ?? []).filter((u) => !u.currentLeadName);
  const joinCandidates = user?.roleName === "FIRST_RESPONDER" ? [] : (units ?? []).filter((u) => !!u.currentLeadName);

  if (isLoading) return <p className="text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>;

  if (shift) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {t("onDuty", { plate: shift.unitPlateNumber })}{" "}
            <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${shift.roleInShift === "LEAD" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>{tShiftRole(shift.roleInShift)}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t("since", { time: new Date(shift.startTime).toLocaleTimeString() })}</p>
          {shift.roleInShift === "LEAD" && (
            <div className="flex items-center gap-2 text-[10px] mt-1">
              <LocationStatusBadge status={locationSharing.status} lastUpdatedAt={locationSharing.lastUpdatedAt} t={t} />
              <button type="button" onClick={() => locationSharing.setEnabled((v) => !v)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline">
                {locationSharing.enabled ? t("pause") : t("resume")}
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => (shift.roleInShift === "LEAD" ? endShift.mutate(undefined) : leaveShift.mutate(undefined))}
          disabled={endShift.isPending || leaveShift.isPending}
          className="px-3.5 py-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-medium rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 shrink-0"
        >
          {(endShift.isPending || leaveShift.isPending) ? "…" : shift.roleInShift === "LEAD" ? t("endShift") : t("leaveShift")}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("offDuty")}</p>
      </div>

      {user?.roleName === "FIRST_RESPONDER" ? (
        (units ?? []).length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("noUnitAssigned")}</p>
        ) : (
          <button
            type="button"
            onClick={() => startShift.mutate({ unitId: units![0].id })}
            disabled={startShift.isPending}
            className="px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md disabled:opacity-50"
          >
            {startShift.isPending ? t("starting") : t("startShift")}
          </button>
        )
      ) : (
        <>
          {startCandidates.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">{t("startShiftAs", { role: tShiftRole("LEAD") })}</p>
              <div className="flex flex-col gap-1.5">
                {startCandidates.map((u) => (
                  <button key={u.id} type="button" onClick={() => startShift.mutate({ unitId: u.id })} disabled={startShift.isPending} className="flex items-center justify-between px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                    <span className="text-slate-900 dark:text-slate-100">{u.plateNumber}</span>
                    <span className="text-xs text-blue-600 dark:text-blue-400">{t("startAs", { role: tShiftRole("LEAD") })}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {joinCandidates.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">{t("joinACrew")}</p>
              <div className="flex flex-col gap-1.5">
                {joinCandidates.map((u) => (
                  <button key={u.id} type="button" onClick={() => joinShift.mutate({ unitId: u.id })} disabled={joinShift.isPending} className="flex items-center justify-between px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-md text-sm hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">
                    <span className="text-slate-900 dark:text-slate-100">{u.plateNumber} — {t("ledBy", { name: u.currentLeadName ?? tCommon("unknown") })}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{t("joinAs", { role: tShiftRole("CREW") })}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(units ?? []).length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t("noUnitsAtFacility")}</p>}

          {(startShift.isError || joinShift.isError) && (
            <p className="text-xs text-red-600 dark:text-red-400">{(startShift.error ?? joinShift.error) instanceof Error ? (startShift.error ?? joinShift.error)?.message : t("startShiftError")}</p>
          )}
        </>
      )}
    </div>
  );
}
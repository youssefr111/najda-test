"use client";

import { useTranslations } from "next-intl";
import { useAssignUnit } from "@/hooks/missions/useAssignUnit";
import { UNIT_STATUS_BADGE, unitTypeLabel, unitStatusLabel } from "@/lib/dispatch/format";
import { estimateEtaMinutes } from "@/lib/dispatch/haversine";
import type { Incident } from "@/types/incident";
import type { UnitAssignmentSelection } from "@/hooks/dispatch/useUnitAssignmentSelection";
import type { UnitType } from "@/types/unit";

const ALL_TYPES: UnitType[] = ["AMBULANCE", "FIRE_TRUCK", "POLICE_CAR", "FIRST_RESPONDER"];

export default function UnitAssignmentPanel({ incident, selection }: { incident: Incident; selection: UnitAssignmentSelection }) {
  const t = useTranslations("unitAssignment");
  const tEnums = useTranslations("enums");
  const assignUnit = useAssignUnit();
  const { sorted, isLoading, typeFilter, setTypeFilter, hoveredId, setHoveredId, selectedId, setSelectedId } = selection;

  const selectedEntry = sorted.find((e) => e.unit.id === selectedId);

  async function handleAssign() {
    if (!selectedId) return;
    await assignUnit.mutateAsync({ incidentId: incident.id, unitId: selectedId });
    setSelectedId(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 overflow-x-auto">
        <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>{t("all")}</FilterChip>
        {ALL_TYPES.map((ut) => (
          <FilterChip key={ut} active={typeFilter === ut} onClick={() => setTypeFilter(ut)}>{unitTypeLabel(tEnums, ut)}</FilterChip>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("loadingUnits")}</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("noUnits")}</p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
          {sorted.map(({ unit, distanceKm, usingFacility }) => {
            const isSelected = selectedId === unit.id;
            return (
              <div
                key={unit.id}
                onMouseEnter={() => setHoveredId(unit.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => setSelectedId(unit.id)}
                className={`flex items-center justify-between gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                  isSelected
                    ? "border-blue-400 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30"
                    : hoveredId === unit.id
                    ? "border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {unit.plateNumber}{" "}
                    <span className={`ms-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${UNIT_STATUS_BADGE[unit.status]}`}>{unitStatusLabel(tEnums, unit.status)}</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {unitTypeLabel(tEnums, unit.unitType)} · {unit.facilityName ?? t("noStation")}
                    {unit.currentLeadName && ` · ${t("leadLabel", { name: unit.currentLeadName })}`}
                    {" · "}{t("etaLabel", { minutes: estimateEtaMinutes(distanceKm), distance: distanceKm.toFixed(1), fromStation: usingFacility ? t("fromStation") : "" })}
                  </p>
                </div>

                {isSelected && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleAssign(); }}
                    disabled={assignUnit.isPending}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {assignUnit.isPending ? t("assigning") : t("assign")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedEntry && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("selectedNote", { plate: selectedEntry.unit.plateNumber ? selectedEntry.unit.plateNumber : t("unknown")})}
        </p>
      )}

      {assignUnit.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {assignUnit.error instanceof Error ? assignUnit.error.message : t("assignError")}
        </p>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}>
      {children}
    </button>
  );
}
"use client";

import { useTranslations } from "next-intl";
import { useIncident } from "@/hooks/incidents/useIncident";
import { useAvailableUnits } from "@/hooks/units/useAvailableUnits";
import MissionRouteMap from "./MissionRouteMap";
import IncidentMediaGallery from "@/components/Shared/IncidentMediaGallery";
import type { Mission } from "@/types/mission";

export default function MyMissionDetail({ mission }: { mission: Mission }) {
  const t = useTranslations("myMissionDetail");
  const tIncident = useTranslations("incidentDetail");
  const { data: incident, isLoading } = useIncident(mission.incidentId);
  const { data: units } = useAvailableUnits();
  const unit = units?.find((u) => u.id === mission.unitId);

  if (isLoading) return <p className="text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>;
  if (!incident) return null;

  const textMessage = incident.media.find((m) => m.mediaType === "TEXT")?.textContent;
  const attachments = incident.media.filter((m) => m.mediaType !== "TEXT");

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
      {mission.status !== "ARRIVED" && (
        <MissionRouteMap
          unitType={mission.unitType}
          unitLatitude={unit?.latitude ?? null} unitLongitude={unit?.longitude ?? null}
          facilityLatitude={unit?.facilityLatitude ?? null} facilityLongitude={unit?.facilityLongitude ?? null}
          destinationLatitude={incident.latitude} destinationLongitude={incident.longitude}
        />
      )}

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">{t("reportedMessage")}</p>
        <p className="text-sm text-slate-900 dark:text-slate-100">{textMessage || <span className="text-slate-400 dark:text-slate-500 italic">{tIncident("noMessage")}</span>}</p>
      </div>

      {incident.injuredCount > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400">{t("reportedInjured", { count: incident.injuredCount })}</p>
      )}

      {attachments.length > 0 && (
        <div>
          <IncidentMediaGallery media={attachments} canDelete={false} />
        </div>
      )}
    </div>
  );
}
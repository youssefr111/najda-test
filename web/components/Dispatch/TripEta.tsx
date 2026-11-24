"use client";

import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";
import { useRouteEta } from "@/hooks/missions/useRouteEta";
import type { HospitalTransfer } from "@/types/hospitalTransfer";
import type { UnitType } from "@/types/unit";

/** "To Cairo University Hospital: ≈ 9 min · 6.1 km" for an ambulance carrying a patient. */
export default function TripEta({ trip }: { trip: HospitalTransfer }) {
  const t = useTranslations("missionList");
  const lat = trip.unitLatitude ?? trip.unitFacilityLatitude;
  const lon = trip.unitLongitude ?? trip.unitFacilityLongitude;
  const eta = useRouteEta(
    lat != null && lon != null ? { latitude: lat, longitude: lon } : null,
    trip.hospitalLatitude != null && trip.hospitalLongitude != null
      ? { latitude: trip.hospitalLatitude, longitude: trip.hospitalLongitude }
      : null,
    trip.unitType as UnitType,
  );
  if (!eta) return null;

  return (
    <p className="flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-300">
      <Clock size={12} className="shrink-0" />
      {t("etaToHospital", {
        hospital: trip.hospitalName ?? "",
        minutes: eta.minutes,
        distance: eta.distanceKm.toFixed(1),
      })}
    </p>
  );
}

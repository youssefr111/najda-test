import { useMemo, useState } from "react";
import { useAvailableUnits } from "@/hooks/units/useAvailableUnits";
import { CATEGORY_UNIT_TYPE } from "@/lib/dispatch/format";
import { haversineKm } from "@/lib/dispatch/haversine";
import type { Incident } from "@/types/incident";
import type { UnitType } from "@/types/unit";

export function useUnitAssignmentSelection(incident: Incident | undefined) {
  const { data: units, isLoading } = useAvailableUnits();
  const [typeFilter, setTypeFilter] = useState<UnitType | "all">("all");
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const preferredType = incident ? CATEGORY_UNIT_TYPE[incident.category] : undefined;

  const sorted = useMemo(() => {
    if (!incident || !units) return [];
    const available = units
      .filter((u) => u.status === "AVAILABLE")
      .filter((u) => typeFilter === "all" || u.unitType === typeFilter)
      .filter((u) => (u.latitude ?? u.facilityLatitude) != null && (u.longitude ?? u.facilityLongitude) != null);

    return available
      .map((u) => {
        const lat = u.latitude ?? u.facilityLatitude!;
        const lon = u.longitude ?? u.facilityLongitude!;
        const distanceKm = haversineKm(lat, lon, incident.latitude, incident.longitude);
        return { unit: u, lat, lon, distanceKm, usingFacility: u.latitude == null };
      })
      .sort((a, b) => {
        const aPreferred = a.unit.unitType === preferredType ? 0 : 1;
        const bPreferred = b.unit.unitType === preferredType ? 0 : 1;
        if (aPreferred !== bPreferred) return aPreferred - bPreferred;
        return a.distanceKm - b.distanceKm;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, typeFilter, preferredType, incident?.latitude, incident?.longitude]);

  return { sorted, isLoading, preferredType, typeFilter, setTypeFilter, hoveredId, setHoveredId, selectedId, setSelectedId };
}

export type UnitAssignmentSelection = ReturnType<typeof useUnitAssignmentSelection>;
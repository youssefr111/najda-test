import type { Mission, MissionStatus } from "@/types/mission";
import type { ResponseUnit, UnitType } from "@/types/unit";

/** Statuses where a unit is actively working the incident and belongs on the map. */
export const VISIBLE_STATUSES: readonly MissionStatus[] = ["ACCEPTED", "EN_ROUTE", "ARRIVED"];

/** Statuses where a unit is still travelling to the incident, so a route is drawn. */
export const ROUTE_STATUSES: readonly MissionStatus[] = ["ACCEPTED", "EN_ROUTE"];

export const ROUTE_COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#dc2626"] as const;

/** The signed-in responder's own route keeps the first palette colour. */
export const OWN_ROUTE_COLOR = ROUTE_COLORS[0];

export interface TeammateUnit {
  missionId: number;
  plateNumber: string | null;
  unitType: UnitType;
  status: MissionStatus;
  latitude: number;
  longitude: number;
  color: string;
}

export const isRoutable = (unit: TeammateUnit): boolean => ROUTE_STATUSES.includes(unit.status);

/**
 * The other units working the same incident, with a map position and a colour.
 * Colours are assigned by mission id order across ALL other missions (not just
 * the visible ones), so a unit keeps its colour as statuses change. Index 0 of
 * the palette is reserved for the current responder's own route.
 */
export function getTeammateUnits(current: Mission, incidentMissions: Mission[], units: ResponseUnit[]): TeammateUnit[] {
  return incidentMissions
    .filter((m) => m.id !== current.id)
    .sort((a, b) => a.id - b.id)
    .flatMap((m, index) => {
      if (!VISIBLE_STATUSES.includes(m.status)) return [];

      const unit = units.find((u) => u.id === m.unitId);
      const latitude = unit?.latitude ?? unit?.facilityLatitude;
      const longitude = unit?.longitude ?? unit?.facilityLongitude;
      if (latitude == null || longitude == null) return [];

      return [{
        missionId: m.id,
        plateNumber: m.unitPlateNumber || null,
        unitType: m.unitType,
        status: m.status,
        latitude,
        longitude,
        color: ROUTE_COLORS[(index + 1) % ROUTE_COLORS.length],
      }];
    });
}
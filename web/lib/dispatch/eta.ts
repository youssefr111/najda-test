import type { UnitType } from "@/types/unit";

/**
 * Arrival-time estimates.
 *
 * The old estimate was straight-line distance / a flat 40 km/h. That is optimistic twice over: streets are
 * not straight lines, and a short urban hop is far slower than a highway run. This model corrects both,
 * and -- whenever a real driving route is available -- uses the routed time instead (see `useRouteEta`).
 *
 * The constants are engineering judgement for a dense city, not measured data: tune them against your own
 * missions (acceptedAt -> arrivedAt versus distance) once you have a few hundred.
 */

/** Straight-line distance -> road distance. City street networks typically add 30-50%. */
export const ROAD_CIRCUITY = 1.35;

/** Minutes before wheels roll (crew alerted, unit leaves) plus the last-metres approach. */
const TURNOUT_MINUTES = 1;

/** Routed free-flow driving time is optimistic in traffic; this allowance covers congestion on top of it. */
const CONGESTION_FACTOR = 1.15;

const EMERGENCY_TYPES: readonly UnitType[] = ["AMBULANCE", "FIRE_TRUCK", "POLICE_CAR"];

/** Average speed (km/h) over a trip of this ROAD length: short urban trips are slow, longer ones reach faster roads. */
function averageSpeedKmh(roadKm: number, unitType?: UnitType): number {
  const base = roadKm < 3 ? 28 : roadKm < 10 ? 36 : roadKm < 25 ? 45 : 60;
  // Lights and sirens let emergency vehicles move through traffic faster than ordinary cars.
  const priority = unitType && EMERGENCY_TYPES.includes(unitType) ? 1.15 : 1;
  return base * priority;
}

/** Whole minutes (at least 1) for a unit of `unitType` to cover `straightKm` (as the crow flies). */
export function estimateEtaMinutes(straightKm: number, unitType?: UnitType): number {
  const roadKm = straightKm * ROAD_CIRCUITY;
  const minutes = TURNOUT_MINUTES + (roadKm / averageSpeedKmh(roadKm, unitType)) * 60;
  return Math.max(1, Math.round(minutes));
}

/** Routed driving time (minutes, free-flow) -> a realistic arrival time. */
export function etaFromRoute(durationMin: number): number {
  return Math.max(1, Math.round(durationMin * CONGESTION_FACTOR + TURNOUT_MINUTES));
}

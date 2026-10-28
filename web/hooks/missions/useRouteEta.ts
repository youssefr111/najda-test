import { useQuery } from "@tanstack/react-query";
import { fetchDrivingRoute } from "@/lib/dispatch/osrm";
import { ROAD_CIRCUITY, estimateEtaMinutes, etaFromRoute } from "@/lib/dispatch/eta";
import { haversineKm } from "@/lib/dispatch/haversine";
import type { UnitType } from "@/types/unit";

export interface Point { latitude: number; longitude: number }

export interface Eta {
  minutes: number;
  distanceKm: number;
  /** "route": real driving route. "estimate": the road-distance model (route unavailable or still loading). */
  source: "route" | "estimate";
}

const round = (value: number) => Math.round(value * 1000) / 1000; // ~100 m, so a moving unit does not refetch every update

/**
 * Arrival time from `from` to `to`: the routed driving time when a route can be fetched, the road-distance
 * model otherwise -- so something sensible is always shown, and it improves as soon as the route arrives.
 */
export function useRouteEta(from: Point | null, to: Point | null, unitType?: UnitType): Eta | null {
  const routeQuery = useQuery({
    queryKey: ["route-eta", from && round(from.latitude), from && round(from.longitude), to && round(to.latitude), to && round(to.longitude)],
    queryFn: () => fetchDrivingRoute(from!.longitude, from!.latitude, to!.longitude, to!.latitude),
    enabled: !!from && !!to,
    staleTime: 60_000,
    retry: false,
  });

  if (!from || !to) return null;
  if (routeQuery.data) {
    return { minutes: etaFromRoute(routeQuery.data.durationMin), distanceKm: routeQuery.data.distanceKm, source: "route" };
  }
  const straightKm = haversineKm(from.latitude, from.longitude, to.latitude, to.longitude);
  return { minutes: estimateEtaMinutes(straightKm, unitType), distanceKm: straightKm * ROAD_CIRCUITY, source: "estimate" };
}

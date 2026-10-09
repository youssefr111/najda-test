import { useQueries } from "@tanstack/react-query";
import { fetchDrivingRoute } from "@/lib/dispatch/osrm";
import { isRoutable, type TeammateUnit } from "@/lib/dispatch/missionRoutes";

type Coordinates = [number, number][];

interface Destination {
  latitude: number;
  longitude: number;
}

/**
 * Driving routes from each still-travelling teammate to the incident, keyed by
 * mission id. Backed by React Query: a route is only re-fetched when that unit's
 * position actually changes, not whenever any unrelated unit updates -- which
 * keeps us inside the public OSRM server's rate limits.
 */
export function useTeammateRoutes(
  teammates: TeammateUnit[],
  destination: Destination,
  enabled: boolean,
): Record<number, Coordinates> {
  const routable = teammates.filter(isRoutable);

  const results = useQueries({
    queries: routable.map((unit) => ({
      queryKey: ["driving-route", unit.longitude, unit.latitude, destination.longitude, destination.latitude],
      queryFn: async () => {
        const route = await fetchDrivingRoute(unit.longitude, unit.latitude, destination.longitude, destination.latitude);
        if (!route) throw new Error("Driving route unavailable");
        return route.coordinates;
      },
      enabled,
      staleTime: Infinity,
      retry: 1,
    })),
  });

  return Object.fromEntries(
    routable.flatMap((unit, index) => {
      const coordinates = results[index]?.data;
      return coordinates ? [[unit.missionId, coordinates] as const] : [];
    }),
  );
}
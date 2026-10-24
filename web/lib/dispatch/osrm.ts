export interface RouteResult {
  coordinates: [number, number][]; // [lon, lat] pairs
  distanceKm: number;
  durationMin: number;
}

// Free public OSRM-compatible routers, tried in order. Both are community services with no guarantees
// (rate limits, downtime), so trying a second one makes "no route" far less likely. Fine for a graduation
// project; self-host OSRM (or pay for a routing API) before depending on this in production.
const ROUTERS = [
  "https://router.project-osrm.org/route/v1/driving",
  "https://routing.openstreetmap.de/routed-car/route/v1/driving",
];

const REQUEST_TIMEOUT_MS = 8000;

async function fetchFrom(base: string, fromLon: number, fromLat: number, toLon: number, toLat: number): Promise<RouteResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = `${base}/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return { coordinates: route.geometry.coordinates, distanceKm: route.distance / 1000, durationMin: route.duration / 60 };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchDrivingRoute(
  fromLon: number, fromLat: number, toLon: number, toLat: number
): Promise<RouteResult | null> {
  for (const router of ROUTERS) {
    const route = await fetchFrom(router, fromLon, fromLat, toLon, toLat);
    if (route) return route;
  }
  return null; // never let a routing failure break the map itself
}

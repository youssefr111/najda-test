export interface RouteResult {
  coordinates: [number, number][]; // [lon, lat] pairs
  distanceKm: number;
  durationMin: number;
}

// router.project-osrm.org is a free public demo server -- same one the web
// app uses. Fine for development and demos; rate-limited, not something to
// depend on for production traffic.
export async function fetchDrivingRoute(
  fromLon: number,
  fromLat: number,
  toLon: number,
  toLat: number
): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      coordinates: route.geometry.coordinates,
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    };
  } catch {
    return null; // never let a routing failure break the map itself
  }
}

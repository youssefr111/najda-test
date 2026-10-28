import type { IncidentLocationConfig } from "@/types/incident";

type Boundary = IncidentLocationConfig["boundary"];
type Ring = number[][];

const EARTH_RADIUS_METERS = 6_371_000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

function inRing(ring: Ring, lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** The same polygon test the server runs, so the form can say "outside Egypt" before anything is sent. */
export function isWithinBoundary(boundary: Boundary | undefined, lat: number, lng: number): boolean {
  const coordinates = boundary?.coordinates;
  // An unusable outline must never crash the form: the server still validates every submission.
  if (!boundary || !Array.isArray(coordinates)) return true;

  const polygons: Ring[][] = boundary.type === "Polygon" ? [coordinates as Ring[]] : (coordinates as Ring[][]);
  return polygons.some(([outer, ...holes]) => inRing(outer, lng, lat) && !holes.some((hole) => inRing(hole, lng, lat)));
}

/** A closed ring of points around a centre, for drawing the allowed-pin radius on the map. */
export function circleCoordinates(lat: number, lng: number, radiusMeters: number, steps = 64): Ring {
  const angularDistance = radiusMeters / EARTH_RADIUS_METERS;
  const lat1 = toRadians(lat);
  const lng1 = toRadians(lng);

  const ring: Ring = [];
  for (let step = 0; step <= steps; step++) {
    const bearing = (2 * Math.PI * step) / steps;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) + Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
        Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
      );
    ring.push([toDegrees(lng2), toDegrees(lat2)]);
  }
  return ring;
}
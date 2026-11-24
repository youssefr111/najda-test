"use client";

import { useEffect, useMemo, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { Building2, MapPin } from "lucide-react";
import { useIncidentMissions } from "@/hooks/missions/useIncidentMissions";
import { useIncidentTransfers } from "@/hooks/hospitals/useIncidentTransfers";
import TripEta from "./TripEta";
import { fetchDrivingRoute } from "@/lib/dispatch/osrm";
import { UnitIcon } from "@/lib/dispatch/unitIcons";
import { VISIBLE_STATUSES, ROUTE_STATUSES, ROUTE_COLORS } from "@/lib/dispatch/missionRoutes";
import type { Incident } from "@/types/incident";
import type { UnitAssignmentSelection } from "@/hooks/dispatch/useUnitAssignmentSelection";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export default function LiveOpsMap({ incident, assignment }: { incident: Incident; assignment?: UnitAssignmentSelection }) {
  const { data: missions } = useIncidentMissions(incident.id);

  const visibleMissions = (missions ?? []).filter((m) =>
    VISIBLE_STATUSES.includes(m.status)
  );

  const routeMissions = visibleMissions.filter((m) =>
    ROUTE_STATUSES.includes(m.status)
  );

  const [routeMode, setRouteMode] = useState<"driving" | "straight">("driving");
  const [drivingRoutes, setDrivingRoutes] = useState<Record<number, [number, number][]>>({});

  // Ambulances already taking a patient to a hospital: show where they are HEADING (the hospital), not only the
  // way to the incident. Uses the transfer's own unit position, so it works even when no unit-assignment
  // controller is passed to this map.
  const { data: transfers } = useIncidentTransfers(incident.id);
  const hospitalTrips = useMemo(
    () =>
      (transfers ?? []).filter(
        (trip) =>
          trip.status !== "ARRIVED" && trip.hospitalLatitude != null && trip.hospitalLongitude != null &&
          (trip.unitLatitude ?? trip.unitFacilityLatitude) != null && (trip.unitLongitude ?? trip.unitFacilityLongitude) != null,
      ),
    [transfers],
  );
  const tripsKey = JSON.stringify(
    hospitalTrips.map((trip) => [trip.id, trip.unitLatitude ?? trip.unitFacilityLatitude, trip.unitLongitude ?? trip.unitFacilityLongitude, trip.hospitalLatitude, trip.hospitalLongitude]),
  );
  const [hospitalRoutes, setHospitalRoutes] = useState<Record<number, [number, number][]>>({});

  useEffect(() => {
    if (routeMode !== "driving" || hospitalTrips.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        hospitalTrips.map(async (trip) => {
          const route = await fetchDrivingRoute(
            (trip.unitLongitude ?? trip.unitFacilityLongitude)!, (trip.unitLatitude ?? trip.unitFacilityLatitude)!,
            trip.hospitalLongitude!, trip.hospitalLatitude!,
          );
          return route ? ([trip.id, route.coordinates] as const) : null;
        }),
      );
      if (cancelled) return;
      const next: Record<number, [number, number][]> = {};
      for (const entry of entries) if (entry) next[entry[0]] = entry[1];
      setHospitalRoutes(next);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeMode, tripsKey]);

  useEffect(() => {
    if (routeMode !== "driving" || routeMissions.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        routeMissions.map(async (m) => {
          const unit = assignment?.units?.find((u) => u.id === m.unitId);
          if (!unit) return null;

          const lat = unit.latitude ?? unit.facilityLatitude;
          const lon = unit.longitude ?? unit.facilityLongitude;
          if (lat == null || lon == null) return null;

          const route = await fetchDrivingRoute(
            lon,
            lat,
            incident.longitude,
            incident.latitude
          );

          return route ? ([m.id, route.coordinates] as const) : null;
        })
      );
      if (cancelled) return;
      const next: Record<number, [number, number][]> = {};
      for (const entry of entries) if (entry) next[entry[0]] = entry[1];
      setDrivingRoutes(next);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeMode, missions, assignment?.units, incident.latitude, incident.longitude]);

function straightLineFor(missionId: number): [number, number][] | null {
  const mission = routeMissions.find((m) => m.id === missionId);
  const unit = assignment?.units?.find((u) => u.id === mission?.unitId);

  if (!unit) return null;

  const lat = unit.latitude ?? unit.facilityLatitude;
  const lon = unit.longitude ?? unit.facilityLongitude;

  if (lat == null || lon == null) return null;

  return [
    [lon, lat],
    [incident.longitude, incident.latitude],
  ];
}

  return (
    <div className="relative w-full h-full min-h-96 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800" dir="ltr">
      <div className="absolute top-2 right-2 z-10 flex bg-white dark:bg-slate-900 rounded-md shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-medium">
        <button type="button" onClick={() => setRouteMode("driving")} className={`px-2.5 py-1.5 transition-colors ${routeMode === "driving" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Driving</button>
        <button type="button" onClick={() => setRouteMode("straight")} className={`px-2.5 py-1.5 transition-colors ${routeMode === "straight" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Straight</button>
      </div>

      {hospitalTrips.length > 0 && (
        <div className="absolute bottom-2 left-2 z-10 flex flex-col gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-2.5 py-1.5 shadow-md">
          {hospitalTrips.map((trip) => <TripEta key={trip.id} trip={trip} />)}
        </div>
      )}

      <div className="absolute inset-0 dark:invert dark:hue-rotate-180">
        <Map initialViewState={{ longitude: incident.longitude, latitude: incident.latitude, zoom: 13 }} mapStyle="https://tiles.openfreemap.org/styles/liberty">
          <Marker longitude={incident.longitude} latitude={incident.latitude} anchor="bottom">
            <div className="dark:invert dark:hue-rotate-180">
              <div className="h-9 w-9 rounded-full bg-[#db313f] flex items-center justify-center shadow-lg border-2 border-white">
                <MapPin size={18} className="text-white" />
              </div>
            </div>
          </Marker>

          {/* Units actively working THIS incident -- always shown, colored per mission's route. */}
          {visibleMissions.map((m, index) => {
            const unit = assignment?.units?.find((u) => u.id === m.unitId);
            if (!unit) return null;

            const lat = unit.latitude ?? unit.facilityLatitude;
            const lon = unit.longitude ?? unit.facilityLongitude;
            if (lat == null || lon == null) return null;
            const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
            return (
              <Marker key={`mission-${m.id}`} longitude={lon} latitude={lat} anchor="bottom">
                <div className="dark:invert dark:hue-rotate-180" title={`${m.unitPlateNumber} · assigned`}>
                  <div className="h-7 w-7 rounded-full flex items-center justify-center shadow-md border-2 border-white" style={{ backgroundColor: color }}>
                    <UnitIcon unitType={unit.unitType} />
                  </div>
                </div>
              </Marker>
            );
          })}

          {/* Assignable units -- interactive when a selection controller is passed in. */}
          {assignment?.sorted.map(({ unit, lat, lon }) => {
            if (lat == null || lon == null) return null;
            const isHovered = assignment.hoveredId === unit.id;
            const isSelected = assignment.selectedId === unit.id;
            return (
              <Marker key={`assignable-${unit.id}`} longitude={lon} latitude={lat} anchor="bottom">
                <button
                  type="button"
                  onMouseEnter={() => assignment.setHoveredId(unit.id)}
                  onMouseLeave={() => assignment.setHoveredId(null)}
                  onClick={() => assignment.setSelectedId(unit.id)}
                  className="dark:invert dark:hue-rotate-180 cursor-pointer"
                  title={unit.plateNumber ?? unit.unitType}
                >
                  <div
                    className={`rounded-full flex items-center justify-center shadow-md border-2 border-white transition-transform duration-150 ${isSelected ? "bg-blue-600" : "bg-slate-500"} ${isHovered ? "scale-125 brightness-110" : "scale-100"}`}
                    style={{ width: isSelected ? 34 : 26, height: isSelected ? 34 : 26 }}
                  >
                    <UnitIcon unitType={unit.unitType} size={isSelected ? 16 : 12} />
                  </div>
                </button>
              </Marker>
            );
          })}

          {/* Hospital trips: the hospital, the ambulance carrying the patient, and the route between them. */}
          {hospitalTrips.map((trip) => {
            const unitLat = (trip.unitLatitude ?? trip.unitFacilityLatitude)!;
            const unitLon = (trip.unitLongitude ?? trip.unitFacilityLongitude)!;
            const coords = routeMode === "driving" && hospitalRoutes[trip.id]
              ? hospitalRoutes[trip.id]
              : ([[unitLon, unitLat], [trip.hospitalLongitude!, trip.hospitalLatitude!]] as [number, number][]);
            const drivingRoute = routeMode === "driving" && !!hospitalRoutes[trip.id];
            return (
              <div key={`trip-${trip.id}`}>
                <Marker longitude={trip.hospitalLongitude!} latitude={trip.hospitalLatitude!} anchor="bottom">
                  <div className="dark:invert dark:hue-rotate-180" title={trip.hospitalName ?? undefined}>
                    <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center shadow-lg border-2 border-white"><Building2 size={15} className="text-white" /></div>
                  </div>
                </Marker>
                <Marker longitude={unitLon} latitude={unitLat} anchor="bottom">
                  <div className="dark:invert dark:hue-rotate-180">
                    <div className="h-7 w-7 rounded-full bg-purple-600 flex items-center justify-center shadow-md border-2 border-white"><UnitIcon unitType={trip.unitType as never} /></div>
                  </div>
                </Marker>
                <Source id={`trip-route-${trip.id}`} type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }}>
                  <Layer
                    id={`trip-route-line-${trip.id}`}
                    type="line"
                    paint={drivingRoute
                      ? { "line-color": "#9333ea", "line-width": 4, "line-opacity": 0.85 }
                      : { "line-color": "#9333ea", "line-width": 3, "line-opacity": 0.6, "line-dasharray": [2, 2] }}
                  />
                </Source>
              </div>
            );
          })}

          {routeMissions.map((m, index) => {
            const coords = routeMode === "driving" ? drivingRoutes[m.id] : straightLineFor(m.id);
            if (!coords) return null;
            const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
            return (
              <Source key={`route-${m.id}`} id={`route-${m.id}`} type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }}>
                <Layer id={`route-line-${m.id}`} type="line" paint={routeMode === "driving" ? { "line-color": color, "line-width": 4, "line-opacity": 0.8 } : { "line-color": color, "line-width": 3, "line-opacity": 0.7, "line-dasharray": [2, 2] }} />
              </Source>
            );
          })}
        </Map>
      </div>
    </div>
  );
}
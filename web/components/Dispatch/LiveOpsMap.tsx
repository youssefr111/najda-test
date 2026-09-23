"use client";

import { useEffect, useState } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { MapPin } from "lucide-react";
import { useIncidentMissions } from "@/hooks/missions/useIncidentMissions";
import { fetchDrivingRoute } from "@/lib/dispatch/osrm";
import { UnitIcon } from "@/lib/dispatch/unitIcons";
import type { Incident } from "@/types/incident";
import type { UnitAssignmentSelection } from "@/hooks/dispatch/useUnitAssignmentSelection";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const ACTIVE_ROUTE_STATUSES = ["ACCEPTED", "EN_ROUTE"];
const ROUTE_COLORS = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#dc2626"];

export default function LiveOpsMap({ incident, assignment }: { incident: Incident; assignment?: UnitAssignmentSelection }) {
  const { data: missions } = useIncidentMissions(incident.id);
  const [routeMode, setRouteMode] = useState<"driving" | "straight">("driving");
  const [drivingRoutes, setDrivingRoutes] = useState<Record<number, [number, number][]>>({});

  const activeMissions = (missions ?? []).filter((m) => ACTIVE_ROUTE_STATUSES.includes(m.status));

  useEffect(() => {
    if (routeMode !== "driving" || activeMissions.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        activeMissions.map(async (m) => {
          const entry = assignment?.sorted.find((e) => e.unit.id === m.unitId);
          if (!entry) return null;
          const route = await fetchDrivingRoute(entry.lon, entry.lat, incident.longitude, incident.latitude);
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
  }, [routeMode, missions, incident.latitude, incident.longitude]);

  function straightLineFor(missionId: number): [number, number][] | null {
    const mission = activeMissions.find((m) => m.id === missionId);
    const entry = assignment?.sorted.find((e) => e.unit.id === mission?.unitId);
    if (!entry) return null;
    return [[entry.lon, entry.lat], [incident.longitude, incident.latitude]];
  }

  return (
    <div className="relative w-full h-full min-h-96 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800" dir="ltr">
      <div className="absolute top-2 right-2 z-10 flex bg-white dark:bg-slate-900 rounded-md shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-medium">
        <button type="button" onClick={() => setRouteMode("driving")} className={`px-2.5 py-1.5 transition-colors ${routeMode === "driving" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Driving</button>
        <button type="button" onClick={() => setRouteMode("straight")} className={`px-2.5 py-1.5 transition-colors ${routeMode === "straight" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>Straight</button>
      </div>

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
          {activeMissions.map((m, index) => {
            const entry = assignment?.sorted.find((e) => e.unit.id === m.unitId);
            if (!entry) return null;
            const color = ROUTE_COLORS[index % ROUTE_COLORS.length];
            return (
              <Marker key={`mission-${m.id}`} longitude={entry.lon} latitude={entry.lat} anchor="bottom">
                <div className="dark:invert dark:hue-rotate-180" title={`${m.unitPlateNumber} · assigned`}>
                  <div className="h-7 w-7 rounded-full flex items-center justify-center shadow-md border-2 border-white" style={{ backgroundColor: color }}>
                    <UnitIcon unitType={entry.unit.unitType} />
                  </div>
                </div>
              </Marker>
            );
          })}

          {/* Assignable units -- interactive when a selection controller is passed in. */}
          {assignment?.sorted.map(({ unit, lat, lon }) => {
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
                    className={`rounded-full flex items-center justify-center shadow-md border-2 border-white transition-transform duration-150 ${isSelected ? "bg-blue-600" : "bg-slate-500"} ${isHovered ? "scale-125" : "scale-100"}`}
                    style={{ width: isSelected ? 34 : 26, height: isSelected ? 34 : 26 }}
                  >
                    <UnitIcon unitType={unit.unitType} size={isSelected ? 16 : 12} />
                  </div>
                </button>
              </Marker>
            );
          })}

          {activeMissions.map((m, index) => {
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
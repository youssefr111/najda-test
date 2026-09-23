"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { MapPin } from "lucide-react";
import { fetchDrivingRoute } from "@/lib/dispatch/osrm";
import { UnitIcon } from "@/lib/dispatch/unitIcons";
import type { UnitType } from "@/types/unit";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type RouteMode = "driving" | "straight";

export default function MissionRouteMap({
  unitType, unitLatitude, unitLongitude, facilityLatitude, facilityLongitude, destinationLatitude, destinationLongitude,
}: {
  unitType: UnitType;
  unitLatitude: number | null; unitLongitude: number | null;
  facilityLatitude: number | null; facilityLongitude: number | null;
  destinationLatitude: number; destinationLongitude: number;
}) {
  const t = useTranslations("missionRouteMap");
  const [routeMode, setRouteMode] = useState<RouteMode>("driving");
  const [drivingCoords, setDrivingCoords] = useState<[number, number][] | null>(null);

  const lat = unitLatitude ?? facilityLatitude;
  const lon = unitLongitude ?? facilityLongitude;
  const hasUnitPosition = lat != null && lon != null;
  const usingFacility = hasUnitPosition && unitLatitude == null;

  useEffect(() => {
    if (routeMode !== "driving" || !hasUnitPosition) return;
    let cancelled = false;
    fetchDrivingRoute(lon!, lat!, destinationLongitude, destinationLatitude).then((route) => {
      if (!cancelled) setDrivingCoords(route?.coordinates ?? null);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeMode, lat, lon, destinationLatitude, destinationLongitude]);

  const centerLon = hasUnitPosition ? (lon! + destinationLongitude) / 2 : destinationLongitude;
  const centerLat = hasUnitPosition ? (lat! + destinationLatitude) / 2 : destinationLatitude;
  const coords: [number, number][] | null = hasUnitPosition
    ? (routeMode === "driving" && drivingCoords ? drivingCoords : [[lon!, lat!], [destinationLongitude, destinationLatitude]])
    : null;

  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800" dir="ltr">
      {hasUnitPosition && (
        <div className="absolute top-2 right-2 z-10 flex bg-white dark:bg-slate-900 rounded-md shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden text-[11px] font-medium">
          <button type="button" onClick={() => setRouteMode("driving")} className={`px-2 py-1 ${routeMode === "driving" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300"}`}>{t("driving")}</button>
          <button type="button" onClick={() => setRouteMode("straight")} className={`px-2 py-1 ${routeMode === "straight" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300"}`}>{t("straight")}</button>
        </div>
      )}

      <div className="absolute inset-0 dark:invert dark:hue-rotate-180">
        <Map initialViewState={{ longitude: centerLon, latitude: centerLat, zoom: hasUnitPosition ? 12 : 14 }} mapStyle="https://tiles.openfreemap.org/styles/liberty">
          {hasUnitPosition && (
            <Marker longitude={lon!} latitude={lat!} anchor="bottom">
              <div className="dark:invert dark:hue-rotate-180" title={usingFacility ? t("yourStation") : t("yourUnit")}>
                <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center shadow-md border-2 border-white"><UnitIcon unitType={unitType} /></div>
              </div>
            </Marker>
          )}
          <Marker longitude={destinationLongitude} latitude={destinationLatitude} anchor="bottom">
            <div className="dark:invert dark:hue-rotate-180">
              <div className="h-8 w-8 rounded-full bg-[#db313f] flex items-center justify-center shadow-lg border-2 border-white"><MapPin size={15} className="text-white" /></div>
            </div>
          </Marker>
          {coords && (
            <Source id="mission-route" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }}>
              <Layer id="mission-route-line" type="line" paint={routeMode === "driving" ? { "line-color": "#2563eb", "line-width": 4, "line-opacity": 0.8 } : { "line-color": "#2563eb", "line-width": 3, "line-opacity": 0.7, "line-dasharray": [2, 2] }} />
            </Source>
          )}
        </Map>
      </div>
      {!hasUnitPosition && <p className="absolute bottom-1 left-2 text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">{t("noUnitLocation")}</p>}
      {usingFacility && <p className="absolute bottom-1 left-2 text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">{t("fromStation")}</p>}
    </div>
  );
}
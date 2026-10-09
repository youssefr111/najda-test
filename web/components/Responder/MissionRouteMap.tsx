"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Map, { Marker, Source, Layer, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { MapPin, Users, LocateFixed } from "lucide-react";
import { fetchDrivingRoute } from "@/lib/dispatch/osrm";
import { UnitIcon } from "@/lib/dispatch/unitIcons";
import { useTeammateRoutes } from "@/hooks/missions/useTeammateRoutes";
import { missionStatusLabel } from "@/lib/dispatch/format";
import { OWN_ROUTE_COLOR, isRoutable, type TeammateUnit } from "@/lib/dispatch/missionRoutes";
import type { UnitType } from "@/types/unit";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

type RouteMode = "driving" | "straight";

export default function MissionRouteMap({
  unitType, unitLatitude, unitLongitude, facilityLatitude, facilityLongitude, destinationLatitude, destinationLongitude, teammates = [],
}: {
  unitType: UnitType;
  unitLatitude: number | null; unitLongitude: number | null;
  facilityLatitude: number | null; facilityLongitude: number | null;
  destinationLatitude: number; destinationLongitude: number;
  teammates?: TeammateUnit[];
}) {
  const t = useTranslations("missionRouteMap");
  const [routeMode, setRouteMode] = useState<RouteMode>("driving");
  const [drivingCoords, setDrivingCoords] = useState<[number, number][] | null>(null);

  const tEnums = useTranslations("enums");
  const [showTeammates, setShowTeammates] = useState(true);
  const teammateRoutes = useTeammateRoutes(
    teammates,
    { latitude: destinationLatitude, longitude: destinationLongitude },
    showTeammates && routeMode === "driving",
  );

  const mapRef = useRef<MapRef>(null);

  const recenterOnIncident = () =>
    mapRef.current?.flyTo({ center: [destinationLongitude, destinationLatitude], zoom: 14, duration: 800 });

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
      <div className="absolute top-2 left-2 z-10 flex flex-col items-start gap-1.5">
        {teammates.length > 0 && (
          <button
            type="button"
            aria-pressed={showTeammates}
            onClick={() => setShowTeammates((visible) => !visible)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md shadow-md border text-[11px] font-medium cursor-pointer transition-colors ${showTeammates ? "bg-blue-600 text-white border-blue-600" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}
          >
            <Users size={12} /> {t("otherUnits", { count: teammates.length })}
          </button>
        )}

        <button
          type="button"
          title={t("recenter")}
          aria-label={t("recenter")}
          onClick={recenterOnIncident}
          className="p-1.5 rounded-md shadow-md border bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <LocateFixed size={14} />
        </button>
      </div>

      {hasUnitPosition && (
        <div className="absolute top-2 right-2 z-10 flex bg-white dark:bg-slate-900 rounded-md shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden text-[11px] font-medium">
          <button type="button" onClick={() => setRouteMode("driving")} className={`px-2 py-1 cursor-pointer ${routeMode === "driving" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300"}`}>{t("driving")}</button>
          <button type="button" onClick={() => setRouteMode("straight")} className={`px-2 py-1 cursor-pointer ${routeMode === "straight" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300"}`}>{t("straight")}</button>
        </div>
      )}

      <div className="absolute inset-0 dark:invert dark:hue-rotate-180">
        <Map ref={mapRef} initialViewState={{ longitude: centerLon, latitude: centerLat, zoom: hasUnitPosition ? 12 : 14 }} mapStyle="https://tiles.openfreemap.org/styles/liberty">
          <NavigationControl position="bottom-right" showCompass={false} />
          {showTeammates && teammates.map((unit) => (
            <Marker key={`teammate-${unit.missionId}`} longitude={unit.longitude} latitude={unit.latitude} anchor="bottom">
              <div className="dark:invert dark:hue-rotate-180" title={`${unit.plateNumber ?? tEnums(`unitType.${unit.unitType}`)} · ${missionStatusLabel(tEnums, unit.status)}`}>
                <div className="h-7 w-7 rounded-full flex items-center justify-center shadow-md border-2 border-white" style={{ backgroundColor: unit.color }}>
                  <UnitIcon unitType={unit.unitType} />
                </div>
              </div>
            </Marker>
          ))}
          {showTeammates && teammates.filter(isRoutable).map((unit) => (
            <RouteLine
              key={`teammate-route-${unit.missionId}`}
              id={`teammate-route-${unit.missionId}`}
              coordinates={
                routeMode === "driving" && teammateRoutes[unit.missionId]
                  ? teammateRoutes[unit.missionId]
                  : [[unit.longitude, unit.latitude], [destinationLongitude, destinationLatitude]]
              }
              color={unit.color}
              dashed={routeMode === "straight"}
            />
          ))}
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
          {coords && <RouteLine id="mission-route" coordinates={coords} color={OWN_ROUTE_COLOR} dashed={routeMode === "straight"} />}
        </Map>
      </div>
      {!hasUnitPosition && <p className="absolute bottom-1 left-2 text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">{t("noUnitLocation")}</p>}
      {usingFacility && <p className="absolute bottom-1 left-2 text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded">{t("fromStation")}</p>}
    </div>
  );
}

function RouteLine({ id, coordinates, color, dashed }: { id: string; coordinates: [number, number][]; color: string; dashed: boolean }) {
  return (
    <Source id={id} type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates }, properties: {} }}>
      <Layer
        id={`${id}-line`}
        type="line"
        paint={{
          "line-color": color,
          "line-width": dashed ? 3 : 4,
          "line-opacity": dashed ? 0.7 : 0.8,
          ...(dashed && { "line-dasharray": [2, 2] }),
        }}
      />
    </Source>
  );
}
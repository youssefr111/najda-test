"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { Building2, Clock, MapPin } from "lucide-react";
import { fetchDrivingRoute } from "@/lib/dispatch/osrm";
import { UnitIcon } from "@/lib/dispatch/unitIcons";
import { useFacilities } from "@/hooks/facilities/useFacilities";
import { useRouteEta } from "@/hooks/missions/useRouteEta";
import type { HospitalTransfer } from "@/types/hospitalTransfer";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

/**
 * What the hospital cares about: where the ambulance is NOW and how it gets HERE. The patient's pickup
 * point stays on the map as a reference, but the route and the arrival time run to this hospital.
 */
export default function IncomingTransferMap({ transfer, hospitalId }: { transfer: HospitalTransfer; hospitalId: number }) {
  const t = useTranslations("incomingTransferMap");
  const tList = useTranslations("missionList");
  const { data: hospitals } = useFacilities("HOSPITAL");
  const hospital = hospitals?.find((h) => h.id === hospitalId) ?? null;

  const unitLat = transfer.unitLatitude ?? transfer.unitFacilityLatitude;
  const unitLon = transfer.unitLongitude ?? transfer.unitFacilityLongitude;
  const hasUnit = unitLat != null && unitLon != null;
  const isOwnCrew = transfer.unitFacilityId === hospitalId;

  const from = hasUnit ? { latitude: unitLat!, longitude: unitLon! } : null;
  const to = hospital ? { latitude: hospital.latitude, longitude: hospital.longitude } : null;
  const eta = useRouteEta(from, to, transfer.unitType as never);

  // The drawn route (the ETA hook only needs the time; the map needs the geometry).
  const [route, setRoute] = useState<[number, number][] | null>(null);
  useEffect(() => {
    if (!from || !to) return;
    let cancelled = false;
    fetchDrivingRoute(from.longitude, from.latitude, to.longitude, to.latitude).then((result) => {
      if (!cancelled) setRoute(result?.coordinates ?? null);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from?.latitude, from?.longitude, to?.latitude, to?.longitude]);

  const line: [number, number][] | null = from && to ? (route ?? [[from.longitude, from.latitude], [to.longitude, to.latitude]]) : null;

  const centerLon = to && from ? (to.longitude + from.longitude) / 2 : (to?.longitude ?? transfer.incidentLongitude);
  const centerLat = to && from ? (to.latitude + from.latitude) / 2 : (to?.latitude ?? transfer.incidentLatitude);

  return (
    <div>
      <div className="relative w-full h-44 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800" dir="ltr">
        {isOwnCrew && (
          <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-600 text-white shadow">
            {t("ownCrewBadge")}
          </span>
        )}
        <div className="absolute inset-0 dark:invert dark:hue-rotate-180">
          <Map initialViewState={{ longitude: centerLon, latitude: centerLat, zoom: from ? 11 : 13 }} mapStyle="https://tiles.openfreemap.org/styles/liberty">
            <Marker longitude={transfer.incidentLongitude} latitude={transfer.incidentLatitude} anchor="bottom">
              <div className="dark:invert dark:hue-rotate-180" title={t("pickupLocation")}>
                <div className="h-6 w-6 rounded-full bg-[#db313f] flex items-center justify-center shadow-md border-2 border-white"><MapPin size={11} className="text-white" /></div>
              </div>
            </Marker>

            {to && (
              <Marker longitude={to.longitude} latitude={to.latitude} anchor="bottom">
                <div className="dark:invert dark:hue-rotate-180" title={t("destinationHospital")}>
                  <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center shadow-lg border-2 border-white"><Building2 size={15} className="text-white" /></div>
                </div>
              </Marker>
            )}

            {from && (
              <Marker longitude={from.longitude} latitude={from.latitude} anchor="bottom">
                <div className="dark:invert dark:hue-rotate-180" title={t("incomingUnit")}>
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white bg-blue-600">
                    <UnitIcon unitType={transfer.unitType as never} />
                  </div>
                </div>
              </Marker>
            )}

            {line && (
              <Source id="incoming-route" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: line }, properties: {} }}>
                <Layer
                  id="incoming-route-layer"
                  type="line"
                  paint={{ "line-color": "#9333ea", "line-width": route ? 4 : 3, "line-opacity": route ? 0.85 : 0.6, ...(route ? {} : { "line-dasharray": [2, 2] }) }}
                />
              </Source>
            )}
          </Map>
        </div>
      </div>
      {eta && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-300">
          <Clock size={12} />
          {eta.source === "route"
            ? tList("etaRoute", { minutes: eta.minutes, distance: eta.distanceKm.toFixed(1) })
            : tList("etaEstimate", { minutes: eta.minutes, distance: eta.distanceKm.toFixed(1) })}
        </p>
      )}
    </div>
  );
}

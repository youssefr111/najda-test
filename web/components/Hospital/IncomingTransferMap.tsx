"use client";

import { useTranslations } from "next-intl";
import Map, { Marker, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { MapPin } from "lucide-react";
import { UnitIcon } from "@/lib/dispatch/unitIcons";
import type { HospitalTransfer } from "@/types/hospitalTransfer";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export default function IncomingTransferMap({ transfer, hospitalId }: { transfer: HospitalTransfer; hospitalId: number }) {
  const t = useTranslations("incomingTransferMap");
  const unitLat = transfer.unitLatitude ?? transfer.unitFacilityLatitude;
  const unitLon = transfer.unitLongitude ?? transfer.unitFacilityLongitude;
  const isOwnCrew = transfer.unitFacilityId === hospitalId;

  const centerLon = unitLat != null ? (transfer.incidentLongitude + unitLon!) / 2 : transfer.incidentLongitude;
  const centerLat = unitLat != null ? (transfer.incidentLatitude + unitLat) / 2 : transfer.incidentLatitude;

  return (
    <div className="relative w-full h-40 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800" dir="ltr">
      {isOwnCrew && (
        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-600 text-white shadow">
          {t("ownCrewBadge")}
        </span>
      )}
      <div className="absolute inset-0 dark:invert dark:hue-rotate-180">
        <Map initialViewState={{ longitude: centerLon, latitude: centerLat, zoom: unitLat != null ? 11 : 13 }} mapStyle="https://tiles.openfreemap.org/styles/liberty">
          <Marker longitude={transfer.incidentLongitude} latitude={transfer.incidentLatitude} anchor="bottom">
            <div className="dark:invert dark:hue-rotate-180" title={t("pickupLocation")}>
              <div className="h-7 w-7 rounded-full bg-[#db313f] flex items-center justify-center shadow-lg border-2 border-white"><MapPin size={13} className="text-white" /></div>
            </div>
          </Marker>

          {unitLat != null && unitLon != null && (
            <Marker longitude={unitLon} latitude={unitLat} anchor="bottom">
              <div className="dark:invert dark:hue-rotate-180" title={t("incomingUnit")}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${isOwnCrew ? "bg-purple-600" : "bg-blue-600"}`}>
                  <UnitIcon unitType={transfer.unitType as never} />
                </div>
              </div>
            </Marker>
          )}

          {unitLat != null && unitLon != null && (
            <Source id="incoming-line" type="geojson" data={{ type: "Feature", geometry: { type: "LineString", coordinates: [[unitLon, unitLat], [transfer.incidentLongitude, transfer.incidentLatitude]] }, properties: {} }}>
              <Layer id="incoming-line-layer" type="line" paint={{ "line-color": "#2563eb", "line-width": 3, "line-opacity": 0.6, "line-dasharray": [2, 2] }} />
            </Source>
          )}
        </Map>
      </div>
    </div>
  );
}
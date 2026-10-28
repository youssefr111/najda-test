"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { LocateFixed, MapPin } from "lucide-react";
import { unitTypeLabel } from "@/lib/dispatch/format";
import { UnitIcon } from "@/lib/dispatch/unitIcons";
import type { IncidentResponder } from "@/types/mission";
import type { UnitType } from "@/types/unit";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const INCIDENT_ZOOM = 17;

type LocatedResponder = IncidentResponder & { latitude: number; longitude: number };

const hasPosition = (responder: IncidentResponder): responder is LocatedResponder =>
  responder.latitude != null && responder.longitude != null;

interface ResponderTrackingProps {
  responders: IncidentResponder[];
  latitude: number;
  longitude: number;
}

/** The citizen's incident map: the incident pin plus every responding unit whose position is shared. */
export default function ResponderTracking({ responders, latitude, longitude }: ResponderTrackingProps) {
  const t = useTranslations("responderTracking");
  const tEnums = useTranslations("enums");
  const mapRef = useRef<MapRef>(null);

  const located = responders.filter(hasPosition);

  // Latest positions, read by the camera logic without making it re-run on every GPS tick.
  const locatedRef = useRef(located);
  useEffect(() => {
    locatedRef.current = located;
  });

  // Re-frame only when the *set* of visible units changes, so a moving unit never fights the camera.
  const visibleUnits = located.map((responder) => responder.missionId).join(",");

  const frameIncident = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const units = locatedRef.current;
    if (units.length === 0) {
      map.flyTo({ center: [longitude, latitude], zoom: INCIDENT_ZOOM });
      return;
    }

    const longitudes = [longitude, ...units.map((unit) => unit.longitude)];
    const latitudes = [latitude, ...units.map((unit) => unit.latitude)];
    map.fitBounds(
      [[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]],
      { padding: 48, maxZoom: 16, duration: 600 },
    );
  }, [latitude, longitude]);

  useEffect(() => {
    frameIncident();
  }, [visibleUnits, frameIncident]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full h-56 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="absolute inset-0 dark:invert dark:hue-rotate-180">
          <Map
            ref={mapRef}
            initialViewState={{ longitude, latitude, zoom: INCIDENT_ZOOM }}
            mapStyle="https://tiles.openfreemap.org/styles/liberty"
            cooperativeGestures
          >
            <NavigationControl position="bottom-right" showCompass={false} />

            <Marker longitude={longitude} latitude={latitude} anchor="bottom">
              <div className="dark:invert dark:hue-rotate-180">
                <div className="h-8 w-8 rounded-full bg-[#db313f] flex items-center justify-center shadow-lg border-2 border-white">
                  <MapPin size={16} className="text-white" />
                </div>
              </div>
            </Marker>

            {located.map((responder) => (
              <Marker key={responder.missionId} longitude={responder.longitude} latitude={responder.latitude} anchor="bottom">
                <div className="dark:invert dark:hue-rotate-180" title={unitTypeLabel(tEnums, responder.unitType)}>
                  <ResponderBadge unitType={responder.unitType} large />
                </div>
              </Marker>
            ))}
          </Map>
        </div>

        <button
          type="button"
          title={t("recenter")}
          aria-label={t("recenter")}
          onClick={frameIncident}
          className="absolute top-2 left-2 z-10 p-1.5 rounded-md shadow-md border bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <LocateFixed size={14} />
        </button>
      </div>

      {responders.length > 0 && (
        <ul className="flex flex-col gap-1">
          {responders.map((responder) => (
            <li key={responder.missionId} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
              <ResponderBadge unitType={responder.unitType} />
              <span className="font-medium">{unitTypeLabel(tEnums, responder.unitType)}</span>
              <span className="text-slate-500 dark:text-slate-400">· {t(`status.${responder.status}`)}</span>
              {!hasPosition(responder) && (
                <span className="text-slate-400 dark:text-slate-500">· {t("locationUnavailable")}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResponderBadge({ unitType, large = false }: { unitType: UnitType; large?: boolean }) {
  return (
    <span className={`rounded-full bg-blue-600 flex items-center justify-center border-2 border-white shadow-md ${large ? "h-7 w-7" : "h-5 w-5"}`}>
      <UnitIcon unitType={unitType} size={large ? 13 : 10} />
    </span>
  );
}
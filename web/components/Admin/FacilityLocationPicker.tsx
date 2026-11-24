"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MapPin, RotateCcw } from "lucide-react";
import Map, { Marker, NavigationControl, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { useIncidentLocationConfig } from "@/hooks/incidents/useIncidentLocationConfig";
import { isWithinBoundary } from "@/lib/geo/location";
import { FacilityIcon, FACILITY_COLORS } from "@/lib/facility/facilityIcons";
import type { FacilityType } from "@/types/facility";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

interface FacilityLocationPickerProps {
  value: GeoPoint | null;
  /** The location on file -- what "reset" returns to. Null while creating a facility. */
  savedLocation: GeoPoint | null;
  facilityType: FacilityType;
  onChange: (point: GeoPoint) => void;
}

// Egypt as a whole, shown until a pin exists.
const EGYPT_VIEW = { longitude: 30.8, latitude: 26.8, zoom: 4.8 };
const FACILITY_ZOOM = 15;

// ~11 cm: plenty for a building, and keeps stored values free of float noise.
export const roundCoordinate = (value: number) => Number(value.toFixed(6));

export default function FacilityLocationPicker({ value, savedLocation, facilityType, onChange }: FacilityLocationPickerProps) {
  const t = useTranslations("admin.facilities.form");
  const { data: config } = useIncidentLocationConfig();
  const mapRef = useRef<MapRef>(null);
  const [outsideEgypt, setOutsideEgypt] = useState(false);

  // Read once: after mount the map is driven by clicks and the reset button, not by this prop.
  const [initialView] = useState(() => (value ? { ...value, zoom: FACILITY_ZOOM } : EGYPT_VIEW));

  const hasMoved = !!value && !!savedLocation && (value.latitude !== savedLocation.latitude || value.longitude !== savedLocation.longitude);

  // A pin placed some other way (typed coordinates, reset) may be off-screen: bring the map to it.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!value || !map || map.getBounds().contains([value.longitude, value.latitude])) return;
    map.easeTo({ center: [value.longitude, value.latitude], zoom: Math.max(map.getZoom(), 12), duration: 600 });
  }, [value]);

  function handleMapClick({ lngLat }: MapLayerMouseEvent) {
    const { lat, lng } = lngLat;
    if (!isWithinBoundary(config?.boundary, lat, lng)) {
      setOutsideEgypt(true);
      return;
    }
    setOutsideEgypt(false);
    onChange({ latitude: roundCoordinate(lat), longitude: roundCoordinate(lng) });
  }

  function handleReset() {
    if (!savedLocation) return;
    setOutsideEgypt(false);
    onChange(savedLocation);
    mapRef.current?.easeTo({ center: [savedLocation.longitude, savedLocation.latitude], duration: 600 });
  }

  return (
    <div className="relative h-64 overflow-hidden rounded-md border border-slate-300 dark:border-slate-700" dir="ltr">
      <div className="absolute inset-0 dark:invert dark:hue-rotate-180">
        <Map
          ref={mapRef}
          initialViewState={initialView}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          onClick={handleMapClick}
          cursor="crosshair"
        >
          <NavigationControl position="top-right" showCompass={false} />

          {value && (
            <Marker longitude={value.longitude} latitude={value.latitude} anchor="bottom">
              <div className="dark:invert dark:hue-rotate-180">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: FACILITY_COLORS[facilityType] }}
                >
                  <FacilityIcon facilityType={facilityType} size={18} className="text-white" />
                </div>
              </div>
            </Marker>
          )}
        </Map>
      </div>

      <div className="pointer-events-none absolute inset-s-2 top-2 z-10 flex max-w-[calc(100%-4rem)] flex-col items-start gap-1.5">
        <span className="flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-slate-700 shadow dark:bg-slate-900/90 dark:text-slate-200">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-red-600" />
          {value ? `${value.latitude.toFixed(5)}° N, ${value.longitude.toFixed(5)}° E` : t("noLocation")}
        </span>
        {outsideEgypt && (
          <span role="alert" className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white shadow">
            {t("outsideEgypt")}
          </span>
        )}
      </div>

      {savedLocation && (
        <button
          type="button"
          onClick={handleReset}
          disabled={!hasMoved}
          className="absolute bottom-2 inset-s-2 z-10 flex cursor-pointer items-center gap-1.5 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:disabled:hover:bg-slate-900"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("resetLocation")}
        </button>
      )}
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, LocateFixed, Plus, Minus } from "lucide-react";
import Map, { Layer, Marker, Source, type MapLayerMouseEvent, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { useIncidentLocationConfig } from "@/hooks/incidents/useIncidentLocationConfig";
import { circleCoordinates, distanceMeters, isWithinBoundary } from "@/lib/geo/location";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export interface EmergencyPosition {
  longitude: number;
  latitude: number;
  source: "GPS" | "MANUAL_PIN";
  /** The device's own GPS fix -- the server checks a manual pin against it. */
  deviceLatitude: number;
  deviceLongitude: number;
}

interface EmergencyMapProps {
  onPositionChange: (position: EmergencyPosition | null) => void;
}

interface GpsFix {
  latitude: number;
  longitude: number;
  accuracy: number;
}

const DEFAULT_CENTER = { longitude: 31.2357, latitude: 30.0444 };

const controlButton =
  "h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-white dark:bg-[#242426] shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#2f2f31] transition-colors cursor-pointer group";

export default function EmergencyMap({ onPositionChange }: EmergencyMapProps) {
  const t = useTranslations("emergencyMap");
  const { data: config } = useIncidentLocationConfig();
  const mapRef = useRef<MapRef>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [gpsFix, setGpsFix] = useState<GpsFix | null>(null);
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pinMessage, setPinMessage] = useState<string | null>(null);

  const allowManualPin = config?.allowManualPin ?? false;
  const radiusMeters = config?.manualPinMaxRadiusMeters ?? 0;

  // Nothing is confirmed on mount, so make sure the parent's stored position starts out null.
  useEffect(() => {
    onPositionChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(t("geolocationUnsupported"));
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setPinMessage(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = coords;

        if (config && !isWithinBoundary(config.boundary, latitude, longitude)) {
          setGpsFix(null);
          setPin(null);
          setLocationError(t("gpsOutsideEgypt"));
          onPositionChange(null);
          return;
        }

        setGpsFix({ latitude, longitude, accuracy });
        setPin({ latitude, longitude });
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: allowManualPin ? 16 : 17, duration: 2000 });
        onPositionChange({ latitude, longitude, source: "GPS", deviceLatitude: latitude, deviceLongitude: longitude });
      },
      (error) => {
        setIsLocating(false);
        setLocationError(error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, [config, allowManualPin, onPositionChange, t]);

  // Ask for the location as soon as the rules are known -- an alert can't be sent without it.
  const hasAutoLocated = useRef(false);
  useEffect(() => {
    if (!config || hasAutoLocated.current) return;
    hasAutoLocated.current = true;
    locate();
  }, [config, locate]);

  const handleMapClick = (e: MapLayerMouseEvent) => {
    if (!config?.allowManualPin) return;
    if (!gpsFix) {
      setPinMessage(t("pinNeedsGps"));
      return;
    }

    const { lng, lat } = e.lngLat;
    if (!isWithinBoundary(config.boundary, lat, lng)) {
      setPinMessage(t("pinOutsideEgypt"));
      return;
    }
    if (distanceMeters(lat, lng, gpsFix.latitude, gpsFix.longitude) > config.manualPinMaxRadiusMeters) {
      setPinMessage(t("pinTooFar", { meters: config.manualPinMaxRadiusMeters }));
      return;
    }

    setPinMessage(null);
    setPin({ latitude: lat, longitude: lng });
    onPositionChange({
      latitude: lat,
      longitude: lng,
      source: "MANUAL_PIN",
      deviceLatitude: gpsFix.latitude,
      deviceLongitude: gpsFix.longitude,
    });
  };

  const handleResetPin = () => {
    if (!gpsFix) return;
    setPinMessage(null);
    setPin({ latitude: gpsFix.latitude, longitude: gpsFix.longitude });
    mapRef.current?.flyTo({ center: [gpsFix.longitude, gpsFix.latitude], zoom: 16, duration: 1000 });
    onPositionChange({
      latitude: gpsFix.latitude,
      longitude: gpsFix.longitude,
      source: "GPS",
      deviceLatitude: gpsFix.latitude,
      deviceLongitude: gpsFix.longitude,
    });
  };

  // The area a manual pin may be placed in, drawn around the device's own position.
  const radiusCircle = useMemo(() => {
    if (!allowManualPin || !gpsFix) return null;
    return {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const,
        coordinates: [circleCoordinates(gpsFix.latitude, gpsFix.longitude, radiusMeters)],
      },
      properties: {},
    };
  }, [allowManualPin, gpsFix, radiusMeters]);

  const hint = !gpsFix ? t("shareLocationHint") : allowManualPin ? t("pinHint", { meters: radiusMeters }) : t("gpsOnlyHint");
  const statusTitle = isLocating ? t("acquiringGps") : gpsFix ? t("gpsActive") : t("locationNeeded");
  const statusDetail =
    locationError ?? pinMessage ?? (gpsFix ? t("accuracyMeters", { meters: Math.round(gpsFix.accuracy) }) : t("shareLocationHint"));

  return (
    <div className="relative w-full h-80 sm:h-105 lg:h-125 bg-slate-100 dark:bg-[#111113] transition-colors" dir="ltr">
      <div className="absolute inset-0 dark:invert dark:hue-rotate-180">
        <Map
          ref={mapRef}
          initialViewState={{ ...DEFAULT_CENTER, zoom: 12 }}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          onClick={handleMapClick}
          cursor={allowManualPin && gpsFix ? "crosshair" : "grab"}
        >
          {radiusCircle && (
            <Source id="pin-radius" type="geojson" data={radiusCircle}>
              <Layer id="pin-radius-fill" type="fill" paint={{ "fill-color": "#2563eb", "fill-opacity": 0.1 }} />
              <Layer id="pin-radius-line" type="line" paint={{ "line-color": "#2563eb", "line-width": 2, "line-dasharray": [2, 2] }} />
            </Source>
          )}

          {pin && (
            <Marker longitude={pin.longitude} latitude={pin.latitude} anchor="bottom">
              <div className="relative flex items-center justify-center dark:invert dark:hue-rotate-180">
                <div className="absolute w-12 h-12 bg-[#db313f]/30 rounded-full animate-ping" />
                <div className="h-10 w-10 rounded-full bg-[#db313f] flex items-center justify-center shadow-lg border-2 border-white cursor-pointer">
                  <MapPin size={20} className="text-white" />
                </div>
              </div>
            </Marker>
          )}
        </Map>
      </div>

      {/* Location Overlay Card */}
      <div className="absolute top-4 left-4 right-4 sm:right-auto sm:top-6 sm:left-6 sm:w-72 rounded-xl bg-white/90 dark:bg-[#1a1a1c]/90 backdrop-blur-md p-4 shadow-xl z-10 pointer-events-none transition-colors">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#db313f] flex items-center justify-center shrink-0">
            <MapPin size={20} className="text-white" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[#5b403f] dark:text-[#c9b8b6] font-semibold text-xs tracking-wider">{t("currentCoordinates")}</p>
            <h3 className="font-bold text-[#191c1d] dark:text-[#f3f4f5] text-xs truncate">
              {pin ? `${pin.latitude.toFixed(4)}° N, ${pin.longitude.toFixed(4)}° E` : t("noLocationYet")}
            </h3>
          </div>
        </div>
        <p className="mt-3 text-[#5b403f] dark:text-[#c9b8b6] text-xs hidden sm:block">{hint}</p>
      </div>

      {/* Map UI Controls */}
      <div className="absolute right-4 bottom-4 sm:right-6 sm:bottom-6 flex flex-col gap-2 sm:gap-3 z-10">
        <button onClick={locate} className={controlButton} title={t("useLiveLocation")}>
          <LocateFixed size={20} className="text-[#191c1d] dark:text-[#f3f4f5] group-hover:text-[#db313f] transition-colors" />
        </button>

        {allowManualPin && gpsFix && (
          <button onClick={handleResetPin} className={controlButton} title={t("resetPinToGps")}>
            <MapPin size={20} className="text-[#191c1d] dark:text-[#f3f4f5] group-hover:text-[#db313f] transition-colors" />
          </button>
        )}

        <div className="bg-white dark:bg-[#242426] rounded-lg shadow-lg overflow-hidden flex flex-col transition-colors">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center border-b border-[#e4bebc] dark:border-[#3a2f2e] hover:bg-gray-50 dark:hover:bg-[#2f2f31] transition-colors cursor-pointer"
            title={t("zoomIn")}
          >
            <Plus size={16} className="text-[#191c1d] dark:text-[#f3f4f5]" />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#2f2f31] transition-colors cursor-pointer"
            title={t("zoomOut")}
          >
            <Minus size={16} className="text-[#191c1d] dark:text-[#f3f4f5]" />
          </button>
        </div>
      </div>

      <section className="rounded-lg bg-[#bbd3fd] dark:bg-[#1e2a44] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 transition-colors">
        <div className="flex items-center gap-3">
          <LocateFixed size={22} className="text-[#445A7F] dark:text-[#9db8e8] shrink-0" />
          <div>
            <p className="font-medium text-sm sm:text-base text-[#445A7F] dark:text-[#9db8e8]">{statusTitle}</p>
            <p className="text-[#445A7F]/80 dark:text-[#9db8e8]/80 text-xs sm:text-sm">{statusDetail}</p>
            {!gpsFix && !isLocating && locationError && (
              <p className="mt-1 text-xs sm:text-sm font-medium text-[#b7102a] dark:text-[#ff8a96]">{t("callHotline")}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className={`w-2 h-2 rounded-full animate-pulse ${gpsFix ? "bg-[#006860] dark:bg-[#2dd4a8]" : "bg-amber-500"}`} />
          <span className="font-bold uppercase text-xs sm:text-sm text-[#445A7F] dark:text-[#9db8e8]">
            {gpsFix ? t("connected") : t("waiting")}
          </span>
        </div>
      </section>
    </div>
  );
}
"use client";

import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { MapPin, LocateFixed, Plus, Minus } from "lucide-react";
import Map, { Marker, MapRef, MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

interface EmergencyMapProps {
  onPositionChange: (
    coords: { longitude: number; latitude: number; source: "GPS" | "MANUAL_PIN" } | null
  ) => void;
}

export default function EmergencyMap({ onPositionChange }: EmergencyMapProps) {
  const [locationState, setLocationState] = useState<{
    isLocating: boolean;
    locationError: string | null;
  }>({ isLocating: false, locationError: null });

  const t = useTranslations("emergencyMap");

  const mapRef = useRef<MapRef>(null);
  const defaultCoords = { longitude: 31.2357, latitude: 30.0444 };

  const [viewState, setViewState] = useState({
    longitude: defaultCoords.longitude,
    latitude: defaultCoords.latitude,
    zoom: 15,
  });

  // Mount shows the default pin visually only — it is NOT a confirmed
  // location, so make sure the parent's stored position starts out null.
  useEffect(() => {
    onPositionChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetLiveLocation = () => {
    if (!navigator.geolocation) {
      setLocationState({ isLocating: false, locationError: t("geolocationUnsupported") });
      return;
    }

    setLocationState({ isLocating: true, locationError: null });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude } = position.coords;
        setViewState((prev) => ({ ...prev, longitude, latitude }));
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 17, duration: 2000 });
        setLocationState({ isLocating: false, locationError: null });
        onPositionChange({ longitude, latitude, source: "GPS" });
      },
      (error) => {
        setLocationState({ isLocating: false, locationError: error.message });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleMapClick = (e: MapLayerMouseEvent) => {
    const { lng, lat } = e.lngLat;
    setViewState((prev) => ({ ...prev, longitude: lng, latitude: lat }));
    onPositionChange({ longitude: lng, latitude: lat, source: "MANUAL_PIN" });
  };

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetPin = () => {
    setViewState({ longitude: defaultCoords.longitude, latitude: defaultCoords.latitude, zoom: 15 });
    mapRef.current?.flyTo({ center: [defaultCoords.longitude, defaultCoords.latitude], zoom: 15, duration: 1500 });
    // Reset moves the pin back to the default visually, but that's still
    // not a confirmed location — explicitly clear it, don't leave a stale value.
    onPositionChange(null);
  };

  return (
    <div className="relative w-full h-80 sm:h-105 lg:h-125 bg-slate-100 dark:bg-[#111113] transition-colors" dir="ltr">
      <div className="absolute inset-0 dark:invert dark:hue-rotate-180">
        <Map
          ref={mapRef}
          initialViewState={{
            longitude: defaultCoords.longitude,
            latitude: defaultCoords.latitude,
            zoom: 12,
          }}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
          onClick={handleMapClick}
          cursor="crosshair"
        >
          <Marker longitude={viewState.longitude} latitude={viewState.latitude} anchor="bottom">
            <div className="relative flex items-center justify-center dark:invert dark:hue-rotate-180">
              <div className="absolute w-12 h-12 bg-[#db313f]/30 rounded-full animate-ping" />
              <div className="h-10 w-10 rounded-full bg-[#db313f] flex items-center justify-center shadow-lg border-2 border-white cursor-pointer">
                <MapPin size={20} className="text-white" />
              </div>
            </div>
          </Marker>
        </Map>
      </div>

      {/* Location Overlay Card */}
      <div className="absolute top-4 left-4 right-4 sm:right-auto sm:top-6 sm:left-6 sm:w-72 rounded-xl bg-white/90 dark:bg-[#1a1a1c]/90 backdrop-blur-md p-4 shadow-xl z-10 pointer-events-none transition-colors">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[#db313f] flex items-center justify-center shrink-0">
            <MapPin size={20} className="text-white" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[#5b403f] dark:text-[#c9b8b6] font-semibold text-xs tracking-wider">
              {t("currentCoordinates")}
            </p>
            <h3 className="font-bold text-[#191c1d] dark:text-[#f3f4f5] text-xs truncate">
              {viewState.latitude.toFixed(4)}° N, {Math.abs(viewState.longitude).toFixed(4)}° W
            </h3>
          </div>
        </div>
        <p className="mt-3 text-[#5b403f] dark:text-[#c9b8b6] text-xs hidden sm:block">
          {t("tapToSetLocation")}
        </p>
      </div>

      {/* Map UI Controls */}
      <div className="absolute right-4 bottom-4 sm:right-6 sm:bottom-6 flex flex-col gap-2 sm:gap-3 z-10">
        <button
          onClick={handleGetLiveLocation}
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-white dark:bg-[#242426] shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#2f2f31] transition-colors cursor-pointer group"
          title={t("useLiveLocation")}
        >
          <LocateFixed
            size={20}
            className="text-[#191c1d] dark:text-[#f3f4f5] group-hover:text-[#db313f] transition-colors"
          />
        </button>

        <button
          onClick={handleResetPin}
          className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-white dark:bg-[#242426] shadow-lg flex items-center justify-center hover:bg-gray-50 dark:hover:bg-[#2f2f31] transition-colors cursor-pointer group"
          title={t("resetToHeadquarters")}
        >
          <MapPin
            size={20}
            className="text-[#191c1d] dark:text-[#f3f4f5] group-hover:text-[#db313f] transition-colors"
          />
        </button>

        <div className="bg-white dark:bg-[#242426] rounded-lg shadow-lg overflow-hidden flex flex-col transition-colors">
          <button
            onClick={handleZoomIn}
            className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center border-b border-[#e4bebc] dark:border-[#3a2f2e] hover:bg-gray-50 dark:hover:bg-[#2f2f31] transition-colors cursor-pointer"
            title={t("zoomIn")}
          >
            <Plus size={16} className="text-[#191c1d] dark:text-[#f3f4f5]" />
          </button>
          <button
            onClick={handleZoomOut}
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
            <p className="font-medium text-sm sm:text-base text-[#445A7F] dark:text-[#9db8e8]">
              {locationState.isLocating ? t("acquiringGps") : t("gpsActive")}
            </p>
            <p className="text-[#445A7F]/80 dark:text-[#9db8e8]/80 text-xs sm:text-sm">
              {locationState.locationError ? locationState.locationError : t("accuracyHigh")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-[#006860] dark:bg-[#2dd4a8] animate-pulse" />
          <span className="font-bold uppercase text-xs sm:text-sm text-[#445A7F] dark:text-[#9db8e8]">
            {t("connected")}
          </span>
        </div>
      </section>
    </div>
  );
}
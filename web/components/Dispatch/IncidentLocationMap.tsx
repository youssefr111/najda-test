"use client";

import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { MapPin } from "lucide-react";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export default function IncidentLocationMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
      <div className="absolute inset-0 dark:invert dark:hue-rotate-180">
        <Map initialViewState={{ longitude, latitude, zoom: 18 }} mapStyle="https://tiles.openfreemap.org/styles/liberty" interactive={false}>
          <Marker longitude={longitude} latitude={latitude} anchor="bottom">
            <div className="dark:invert dark:hue-rotate-180">
              <div className="h-8 w-8 rounded-full bg-[#db313f] flex items-center justify-center shadow-lg border-2 border-white">
                <MapPin size={16} className="text-white" />
              </div>
            </div>
          </Marker>
        </Map>
      </div>
    </div>
  );
}
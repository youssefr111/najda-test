"use client";

import { useTranslations } from "next-intl";
import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl } from "maplibre-gl";
import { Building2, MapPin } from "lucide-react";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export interface MapHospital {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  recommended: boolean;
  isOwnFacility: boolean;
}

export default function HospitalSelectionMap({
  incidentLatitude, incidentLongitude, hospitals, hoveredId, selectedId, onHover, onSelect,
}: {
  incidentLatitude: number; incidentLongitude: number;
  hospitals: MapHospital[];
  hoveredId: number | null;
  selectedId: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number) => void;
}) {
  const t = useTranslations("hospitalLabels");

  return (
    <div className="relative w-full h-56 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800" dir="ltr">
      <div className="absolute inset-0 dark:invert dark:hue-rotate-180">
        <Map initialViewState={{ longitude: incidentLongitude, latitude: incidentLatitude, zoom: 11 }} mapStyle="https://tiles.openfreemap.org/styles/liberty">
          <Marker longitude={incidentLongitude} latitude={incidentLatitude} anchor="bottom">
            <div className="dark:invert dark:hue-rotate-180" title={t("incidentLocation")}>
              <div className="h-9 w-9 rounded-full bg-[#db313f] flex items-center justify-center shadow-lg border-2 border-white">
                <MapPin size={18} className="text-white" />
              </div>
            </div>
          </Marker>

          {hospitals.map((h) => {
            const isHovered = hoveredId === h.id;
            const isSelected = selectedId === h.id;
            const color = isSelected ? "bg-blue-600" : h.isOwnFacility ? "bg-purple-600" : h.recommended ? "bg-emerald-600" : "bg-slate-500";
            return (
              <Marker key={h.id} longitude={h.longitude} latitude={h.latitude} anchor="bottom">
                <button
                  type="button"
                  onMouseEnter={() => onHover(h.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect(h.id)}
                  className="dark:invert dark:hue-rotate-180 cursor-pointer"
                  title={h.name}
                >
                  <div
                    className={`rounded-full flex items-center justify-center shadow-md border-2 border-white transition-transform duration-150 ${color} ${isHovered ? "scale-125" : "scale-100"}`}
                    style={{ width: isSelected ? 34 : 28, height: isSelected ? 34 : 28 }}
                  >
                    <Building2 size={isSelected ? 16 : 13} className="text-white" />
                  </div>
                </button>
              </Marker>
            );
          })}
        </Map>
      </div>

      <div className="absolute bottom-1 left-1.5 flex flex-wrap gap-2 bg-white/85 dark:bg-slate-900/85 rounded px-2 py-1 text-[10px] text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-600" /> {t("recommended")}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-600" /> {t("yourBase")}</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-600" /> {t("selected")}</span>
      </div>
    </div>
  );
}
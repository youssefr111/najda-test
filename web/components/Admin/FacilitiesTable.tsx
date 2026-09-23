"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Search, RotateCcw, Table2, MapIcon, MapPinned } from "lucide-react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl, LngLatBounds } from "maplibre-gl";
import { useFacilities } from "@/hooks/facilities/useFacilities";
import type { Facility, FacilityType } from "@/types/facility";
import { useBackfillAddresses } from "@/hooks/facilities/useBackfillAddresses";
import { FacilityIcon, FACILITY_COLORS } from "@/lib/facility/facilityIcons";
import FacilityFormModal from "./FacilityFormModal";
import SeedFacilitiesButton from "./SeedFacilitiesButton";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const FACILITY_TYPES: FacilityType[] = ["HOSPITAL", "AMBULANCE_STATION", "FIRE_STATION", "POLICE_STATION"];

export default function FacilitiesTable() {
  const t = useTranslations("admin.facilities");
  const tEnums = useTranslations("enums");
  const tCommon = useTranslations("common");
  const { data: facilities, isLoading, refetch, isFetching } = useFacilities();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<FacilityType | "all">("all");
  const [view, setView] = useState<"table" | "map">("table");
  const [editing, setEditing] = useState<Facility | "new" | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const backfillAddresses = useBackfillAddresses();

  const filtered = useMemo(() => {
    if (!facilities) return [];
    const q = searchQuery.trim().toLowerCase();
    return facilities.filter((f) => (typeFilter === "all" || f.facilityType === typeFilter) && (!q || f.name.toLowerCase().includes(q)));
  }, [facilities, searchQuery, typeFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">{t("title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("subtitle")}</p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors shrink-0">
          <Plus className="w-4 h-4" /> {t("addFacility")}
        </button>
      </div>

      <SeedFacilitiesButton />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {backfillAddresses.data?.message ?? t("backFillDescription")}
        </p>
        <button
          type="button"
          onClick={() => backfillAddresses.mutate()}
          disabled={backfillAddresses.isPending}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
        >
          <MapPinned className="w-4 h-4" />{t("backFillAddress")}
        </button>
      </div>
      {backfillAddresses.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">{backfillAddresses.error instanceof Error ? backfillAddresses.error.message : "Couldn't start backfill."}</p>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search facilities..." className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-900 dark:text-slate-100" />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>{tCommon("all")}</FilterChip>
            {FACILITY_TYPES.map((ft) => (
              <FilterChip key={ft} active={typeFilter === ft} onClick={() => setTypeFilter(ft)}>{tEnums(`facilityType.${ft}`)}</FilterChip>
            ))}
          </div>

          {/* Table / Map toggle — only needed below lg, where the split view collapses to one panel at a time */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 shrink-0 lg:hidden">
            <button
              type="button"
              onClick={() => setView("table")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] text-xs font-medium transition-colors ${view === "table" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
            >
              <Table2 className="w-3.5 h-3.5" /> {t("tableView")}
            </button>
            <button
              type="button"
              onClick={() => setView("map")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[5px] text-xs font-medium transition-colors ${view === "map" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400"}`}
            >
              <MapIcon className="w-3.5 h-3.5" /> {t("mapView")}
            </button>
          </div>

          <button type="button" onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md disabled:opacity-50">
            <RotateCcw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{tCommon("refresh")}</span>
          </button>
        </div>

        {isLoading ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">Facilities {tCommon("loading")}…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">No facilities match.</p>
        ) : (
          <div className="lg:flex lg:h-140">
            {/* Table panel — always rendered on lg+ (split view); below lg, shown only when the toggle is on "table" */}
            <div className={`${view === "map" ? "hidden" : ""} lg:block lg:flex-1 lg:min-w-0 lg:overflow-y-auto lg:border-e lg:border-slate-200 dark:lg:border-slate-800`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Coordinates</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f) => (
                      <tr
                        key={f.id}
                        onMouseEnter={() => setHoveredId(f.id)}
                        onMouseLeave={() => setHoveredId((current) => (current === f.id ? null : current))}
                        className={`border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${hoveredId === f.id ? "bg-slate-50 dark:bg-slate-800/40" : ""}`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{f.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{tEnums(`facilityType.${f.facilityType}`)}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{f.latitude.toFixed(4)}, {f.longitude.toFixed(4)}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.registered ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>{f.registered ? "Registered" : "Unregistered"}</span></td>
                        <td className="px-4 py-3 text-right"><button type="button" onClick={() => setEditing(f)} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">Edit</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Map panel — always rendered on lg+ (split view); below lg, shown only when the toggle is on "map" */}
            <div className={`${view === "table" ? "hidden" : ""} lg:block lg:w-105 lg:shrink-0 lg:h-full`}>
              <FacilitiesMap facilities={filtered} onEdit={setEditing} hoveredId={hoveredId} onHoverChange={setHoveredId} />
            </div>
          </div>
        )}
      </div>

      {editing && <FacilityFormModal facility={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`}>{children}</button>;
}

function FacilitiesMap({
  facilities,
  onEdit,
  hoveredId,
  onHoverChange,
}: {
  facilities: Facility[];
  onEdit: (f: Facility) => void;
  hoveredId: number | null;
  onHoverChange: (id: number | null) => void;
}) {
  const tEnums = useTranslations("enums");
  const mapRef = useRef<MapRef | null>(null);

  // Fit the map to whatever the current filter shows, whenever it changes.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || facilities.length === 0) return;

    if (facilities.length === 1) {
      map.easeTo({ center: [facilities[0].longitude, facilities[0].latitude], zoom: 13, duration: 400 });
      return;
    }

    const bounds = facilities.reduce(
      (acc, f) => acc.extend([f.longitude, f.latitude]),
      new LngLatBounds([facilities[0].longitude, facilities[0].latitude], [facilities[0].longitude, facilities[0].latitude])
    );
    map.fitBounds(bounds, { padding: 56, duration: 400, maxZoom: 15 });
  }, [facilities]);

  const initialCenter = useMemo(() => {
    if (facilities.length === 0) return { longitude: 0, latitude: 0 };
    const lon = facilities.reduce((sum, f) => sum + f.longitude, 0) / facilities.length;
    const lat = facilities.reduce((sum, f) => sum + f.latitude, 0) / facilities.length;
    return { longitude: lon, latitude: lat };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-130 lg:h-full" dir="ltr">
      <div className="absolute inset-0 dark:invert dark:hue-rotate-180">
        <Map
          ref={mapRef}
          initialViewState={{ ...initialCenter, zoom: 11 }}
          mapStyle="https://tiles.openfreemap.org/styles/liberty"
        >
          <NavigationControl position="top-right" showCompass={false} />
          {facilities.map((f) => {
            const color = FACILITY_COLORS[f.facilityType];
            const isHovered = hoveredId === f.id;
            return (
              <Marker key={f.id} longitude={f.longitude} latitude={f.latitude} anchor="bottom">
                <div className="dark:invert dark:hue-rotate-180 relative">
                  {isHovered && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap px-2 py-1 rounded-md bg-slate-900 text-white text-xs font-medium shadow-lg pointer-events-none">
                      {f.name}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900" />
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => onHoverChange(f.id)}
                    onMouseLeave={() => onHoverChange(null)}
                    onClick={() => onEdit(f)}
                    className="cursor-pointer"
                    title={f.name}
                  >
                    <div
                      className="rounded-full flex items-center justify-center shadow-md border-2 border-white transition-transform duration-150"
                      style={{
                        width: isHovered ? 34 : 28,
                        height: isHovered ? 34 : 28,
                        backgroundColor: color,
                        opacity: f.registered ? 1 : 0.55,
                      }}
                    >
                      <FacilityIcon facilityType={f.facilityType} size={isHovered ? 17 : 14} className="text-white" />
                    </div>
                  </button>
                </div>
              </Marker>
            );
          })}
        </Map>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-md p-2 flex flex-col gap-1">
        {FACILITY_TYPES.map((ft) => (
          <div key={ft} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: FACILITY_COLORS[ft] }}>
              <FacilityIcon facilityType={ft} size={9} className="text-white" />
            </span>
            {tEnums(`facilityType.${ft}`)}
          </div>
        ))}
      </div>
    </div>
  );
}
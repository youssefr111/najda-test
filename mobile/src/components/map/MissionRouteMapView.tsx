import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MapLibreView } from "./MapLibreView";
import { fetchDrivingRoute } from "@/lib/map/osrm";

type RouteMode = "driving" | "straight";

type Props = {
  unitLatitude: number | null;
  unitLongitude: number | null;
  facilityLatitude: number | null;
  facilityLongitude: number | null;
  destinationLatitude: number;
  destinationLongitude: number;
};

/** Mobile port of the web app's MissionRouteMap: unit/station marker, destination pin, and an OSRM driving route. */
export function MissionRouteMapView({
  unitLatitude,
  unitLongitude,
  facilityLatitude,
  facilityLongitude,
  destinationLatitude,
  destinationLongitude,
}: Props) {
  const { t } = useTranslation();
  const [routeMode, setRouteMode] = useState<RouteMode>("driving");
  const [drivingCoords, setDrivingCoords] = useState<[number, number][] | null>(null);

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
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeMode, lat, lon, destinationLatitude, destinationLongitude]);

  const centerLon = hasUnitPosition ? (lon! + destinationLongitude) / 2 : destinationLongitude;
  const centerLat = hasUnitPosition ? (lat! + destinationLatitude) / 2 : destinationLatitude;

  const coords: [number, number][] | null = hasUnitPosition
    ? routeMode === "driving" && drivingCoords
      ? drivingCoords
      : [
          [lon!, lat!],
          [destinationLongitude, destinationLatitude],
        ]
    : null;

  const markers = [
    ...(hasUnitPosition
      ? [{ id: "unit", lng: lon!, lat: lat!, color: "#2563eb", size: 28, label: usingFacility ? "S" : "U" }]
      : []),
    { id: "destination", lng: destinationLongitude, lat: destinationLatitude, color: "#db313f", size: 32, iconType: "pin" as const },
  ];

  return (
    <View className="h-48 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
      {hasUnitPosition ? (
        <View className="absolute right-2 top-2 z-10 flex-row overflow-hidden rounded-md border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900">
          <Pressable onPress={() => setRouteMode("driving")} className={`px-2 py-1 ${routeMode === "driving" ? "bg-blue-600" : ""}`}>
            <Text className={`text-[11px] font-medium ${routeMode === "driving" ? "text-white" : "text-slate-600 dark:text-slate-300"}`}>
              {t("responder.missionMap.driving")}
            </Text>
          </Pressable>
          <Pressable onPress={() => setRouteMode("straight")} className={`px-2 py-1 ${routeMode === "straight" ? "bg-blue-600" : ""}`}>
            <Text className={`text-[11px] font-medium ${routeMode === "straight" ? "text-white" : "text-slate-600 dark:text-slate-300"}`}>
              {t("responder.missionMap.straight")}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <MapLibreView
        style={{ flex: 1 }}
        initialCenter={{ lng: centerLon, lat: centerLat }}
        initialZoom={hasUnitPosition ? 12 : 14}
        markers={markers}
        route={
          coords
            ? {
                coordinates: coords,
                color: "#2563eb",
                width: routeMode === "driving" ? 4 : 3,
                dashed: routeMode === "straight",
              }
            : null
        }
      />

      {!hasUnitPosition ? (
        <View className="absolute bottom-1 left-2 rounded bg-black/50 px-1.5 py-0.5">
          <Text className="text-[10px] text-white">{t("responder.missionMap.noUnitLocation")}</Text>
        </View>
      ) : usingFacility ? (
        <View className="absolute bottom-1 left-2 rounded bg-black/50 px-1.5 py-0.5">
          <Text className="text-[10px] text-white">{t("responder.missionMap.fromStation")}</Text>
        </View>
      ) : null}
    </View>
  );
}

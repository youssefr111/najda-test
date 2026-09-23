import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Location from "expo-location";
import { MapLibreView, type MapLibreViewHandle } from "./MapLibreView";
import { useColorScheme } from "nativewind";
import type { LocationSource } from "@/types/incident";

const DEFAULT_COORDS = { longitude: 31.2357, latitude: 30.0444 }; // Cairo, matches the web app's default pin

export type PickedLocation = { latitude: number; longitude: number; source: LocationSource };

/**
 * Mobile port of the web app's EmergencyMap: a tap-to-drop pin on the same
 * MapLibre style, a "use my location" button, a reset button, and zoom
 * controls. The camera itself only moves on an explicit flyTo (locate-me,
 * reset) -- panning/zooming freely never gets yanked back, same as web.
 */
export function LocationPickerMap({
  value,
  onChange,
}: {
  value: PickedLocation | null;
  onChange: (value: PickedLocation | null) => void;
}) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const mapRef = useRef<MapLibreViewHandle>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const displayLat = value?.latitude ?? DEFAULT_COORDS.latitude;
  const displayLng = value?.longitude ?? DEFAULT_COORDS.longitude;

  async function handleLocateMe() {
    setLocating(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError(t("citizen.report.locationDenied"));
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = position.coords;
      onChange({ latitude, longitude, source: "GPS" });
      mapRef.current?.flyTo(longitude, latitude, 17);
    } catch {
      setLocationError(t("common.error"));
    } finally {
      setLocating(false);
    }
  }

  function handleReset() {
    onChange(null);
    mapRef.current?.flyTo(DEFAULT_COORDS.longitude, DEFAULT_COORDS.latitude, 15);
  }

  return (
    <View className="h-80 overflow-hidden rounded-xl bg-slate-100 dark:bg-[#111113]">
      <MapLibreView
        style={{ flex: 1 }}
        initialCenter={{ lng: DEFAULT_COORDS.longitude, lat: DEFAULT_COORDS.latitude }}
        initialZoom={12}
        onMapPress={({ lng, lat }) => onChange({ latitude: lat, longitude: lng, source: "MANUAL_PIN" })}
        markers={[
          {
            id: "pin",
            lng: displayLng,
            lat: displayLat,
            color: "#db313f",
            size: 36,
            iconType: "pin",
            pulse: true,
          },
        ]}
      />

      {/* Coordinate overlay */}
      <View className="pointer-events-none absolute left-3 right-3 top-3 flex-row items-center gap-3 rounded-xl bg-white/90 p-3 shadow-xl dark:bg-[#1a1a1c]/90">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-[#db313f]">
          <Ionicons name="location" size={18} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="text-[11px] font-semibold tracking-wide text-[#5b403f] dark:text-[#c9b8b6]">
            {value ? t("citizen.report.locationCaptured") : t("citizen.report.location")}
          </Text>
            <Text className="text-xs font-bold text-[#191c1d] dark:text-[#f3f4f5]" numberOfLines={1}>
              {displayLat.toFixed(4)}°, {displayLng.toFixed(4)}°
            </Text>
        </View>
      </View>

      {/* Controls */}
      <View className="absolute bottom-3 right-3 gap-2">
        <Pressable
          onPress={handleLocateMe}
          className="h-11 w-11 items-center justify-center rounded-lg bg-white shadow-lg dark:bg-[#242426]"
        >
          {locating ? (
            <ActivityIndicator size="small" color="#db313f" />
          ) : (
            <Ionicons name="locate" size={20} color={colorScheme === "dark" ? "#fff" : "#191c1d"} />
          )}
        </Pressable>
        <Pressable
          onPress={handleReset}
          className="h-11 w-11 items-center justify-center rounded-lg bg-white shadow-lg dark:bg-[#242426]"
        >
          <Ionicons name="refresh" size={20} color={colorScheme === "dark" ? "#fff" : "#191c1d"} />
        </Pressable>
        <View className="overflow-hidden rounded-lg bg-white shadow-lg dark:bg-[#242426]">
          <Pressable
            onPress={() => mapRef.current?.zoomIn()}
            className="h-11 w-11 items-center justify-center border-b border-[#e4bebc] dark:border-[#3a2f2e]"
          >
            <Ionicons name="add" size={18} color={colorScheme === "dark" ? "#fff" : "#191c1d"} />
          </Pressable>
          <Pressable onPress={() => mapRef.current?.zoomOut()} className="h-11 w-11 items-center justify-center">
            <Ionicons name="remove" size={18} color={colorScheme === "dark" ? "#fff" : "#191c1d"} />
          </Pressable>
        </View>
      </View>

      {locationError ? (
        <View className="absolute bottom-3 left-3 right-16 rounded-md bg-black/60 px-2 py-1">
          <Text className="text-xs text-white">{locationError}</Text>
        </View>
      ) : null}
    </View>
  );
}

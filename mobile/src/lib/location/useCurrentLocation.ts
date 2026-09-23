import { useCallback, useState } from "react";
import * as Location from "expo-location";

export type Coordinates = { latitude: number; longitude: number };

/**
 * One-shot "where am I right now" for the emergency report form. Kept
 * separate from useReportUnitLocation (continuous, shift-scoped tracking)
 * since the two have very different lifecycles.
 */
export function useCurrentLocation() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "granted" | "denied" | "error">("idle");

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== "granted") {
        setStatus("denied");
        return null;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoords(next);
      setStatus("granted");
      return next;
    } catch {
      setStatus("error");
      return null;
    }
  }, []);

  return { coords, status, refresh };
}

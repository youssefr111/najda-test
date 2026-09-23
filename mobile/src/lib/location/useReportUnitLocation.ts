import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { apiFetch } from "@/api/client";

const MIN_INTERVAL_MS = 15_000;

export type LocationSharingStatus = "idle" | "watching" | "denied" | "error";

/**
 * Streams the device's position to the backend while a responder is on
 * shift, mirroring the web app's watchPosition-based reporting. Throttled
 * client-side to one update per MIN_INTERVAL_MS regardless of how often
 * the OS reports movement.
 */
export function useReportUnitLocation(unitId: number | null) {
  const [status, setStatus] = useState<LocationSharingStatus>("idle");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const lastSentRef = useRef(0);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (unitId == null) {
        setStatus("idle");
        return;
      }

      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      setStatus("watching");
      subscriptionRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: MIN_INTERVAL_MS, distanceInterval: 25 },
        (position) => {
          const now = Date.now();
          if (now - lastSentRef.current < MIN_INTERVAL_MS) return;
          lastSentRef.current = now;

          apiFetch(`/api/units/${unitId}/location`, {
            method: "PATCH",
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          })
            .then(() => setLastUpdatedAt(new Date()))
            .catch(() => setStatus("error"));
        }
      );
    }

    start();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [unitId]);

  return { status, lastUpdatedAt };
}

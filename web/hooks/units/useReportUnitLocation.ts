import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";

const MIN_INTERVAL_MS = 15000;

export type LocationSharingStatus = "idle" | "watching" | "unsupported" | "denied" | "error";

export function useReportUnitLocation(unitId: number | null) {
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState<LocationSharingStatus>("idle");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!enabled || unitId == null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("idle");
      return;
    }
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }

    setStatus("watching");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now();
        if (now - lastSentRef.current < MIN_INTERVAL_MS) return;
        lastSentRef.current = now;

        apiFetch(`/api/units/${unitId}/location`, {
          method: "PATCH",
          body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        })
          .then(() => { setStatus("watching"); setLastUpdatedAt(new Date()); })
          .catch(() => setStatus("error"));
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [unitId, enabled]);

  return { status, lastUpdatedAt, enabled, setEnabled };
}
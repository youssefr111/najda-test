import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useLiveInvalidation } from "@/hooks/shared/useLiveInvalidation";
import type { IncidentViewer } from "@/types/incident";

const HEARTBEAT_MS = 15_000;

const presenceKey = (incidentId: number | null) => ["incidents", incidentId, "presence"] as const;

/** The other dispatchers currently viewing this incident. Also registers the caller as a viewer. */
export function useIncidentPresence(incidentId: number | null): IncidentViewer[] {
  const queryClient = useQueryClient();

  useLiveInvalidation(incidentId != null ? `/topic/incidents/${incidentId}/presence` : null, presenceKey(incidentId));

  const { data } = useQuery({
    queryKey: presenceKey(incidentId),
    queryFn: () => apiFetch<IncidentViewer[]>(`/api/incidents/${incidentId}/presence`),
    enabled: incidentId != null,
  });

  useEffect(() => {
    if (incidentId == null) return;
    const path = `/api/incidents/${incidentId}/presence`;

    const beat = () => {
      if (document.visibilityState === "hidden") return; // a backgrounded tab isn't looking at it
      apiFetch<IncidentViewer[]>(path, { method: "PUT" })
        .then((others) => queryClient.setQueryData(presenceKey(incidentId), others))
        .catch(() => {});
    };

    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
      apiFetch(path, { method: "DELETE" }).catch(() => {}); // best effort; the server TTL covers a closed tab
    };
  }, [incidentId, queryClient]);

  return data ?? [];
}
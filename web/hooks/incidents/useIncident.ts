import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useLiveInvalidation } from "@/hooks/shared/useLiveInvalidation";
import type { Incident } from "@/types/incident";

interface UseIncidentOptions {
  /** Refetch whenever the backend announces an incident change. Leave off for read-only history views. */
  live?: boolean;
}

export function useIncident(incidentId: number | null, { live = false }: UseIncidentOptions = {}) {
  const queryKey = ["incidents", incidentId];
  useLiveInvalidation(live && incidentId != null ? "/topic/incidents" : null, queryKey);

  return useQuery({
    queryKey,
    queryFn: () => apiFetch<Incident>(`/api/incidents/${incidentId}`),
    enabled: incidentId != null,
  });
}
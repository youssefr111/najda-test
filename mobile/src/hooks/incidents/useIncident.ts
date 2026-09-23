import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import type { Incident } from "@/types/incident";

export function useIncident(incidentId: number | null) {
  return useQuery({
    queryKey: ["incidents", incidentId],
    queryFn: () => apiFetch<Incident>(`/api/incidents/${incidentId}`),
    enabled: incidentId != null,
    refetchInterval: 5_000,
  });
}

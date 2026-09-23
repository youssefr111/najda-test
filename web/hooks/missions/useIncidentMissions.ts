import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Mission } from "@/types/mission";

export function useIncidentMissions(incidentId: number | null) {
  return useQuery({
    queryKey: ["missions", "incident", incidentId],
    queryFn: () => apiFetch<Mission[]>(`/api/missions?incidentId=${incidentId}`),
    enabled: incidentId != null,
    refetchInterval: 5000,
  });
}
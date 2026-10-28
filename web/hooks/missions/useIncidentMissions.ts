import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useLiveInvalidation } from "@/hooks/shared/useLiveInvalidation";
import type { Mission } from "@/types/mission";

export function useIncidentMissions(incidentId: number | null) {
  const queryKey = ["missions", "incident", incidentId];
  useLiveInvalidation(incidentId != null ? `/topic/incidents/${incidentId}/responders` : null, queryKey);

  return useQuery({
    queryKey,
    queryFn: () => apiFetch<Mission[]>(`/api/missions?incidentId=${incidentId}`),
    enabled: incidentId != null,
  });
}
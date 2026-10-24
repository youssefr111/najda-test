import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useLiveInvalidation } from "@/hooks/shared/useLiveInvalidation";
import type { IncidentResponder } from "@/types/mission";

export function useIncidentResponders(incidentId: number, enabled: boolean) {
  const queryKey = ["incidents", incidentId, "responders"];
  useLiveInvalidation(enabled ? `/topic/incidents/${incidentId}/responders` : null, queryKey);

  return useQuery({
    queryKey,
    queryFn: () => apiFetch<IncidentResponder[]>(`/api/incidents/${incidentId}/responders`),
    enabled,
  });
}
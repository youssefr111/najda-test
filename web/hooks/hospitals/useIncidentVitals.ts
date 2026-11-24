import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useLiveInvalidation } from "@/hooks/shared/useLiveInvalidation";
import type { IncidentTransferVitals } from "@/types/vitals";

/**
 * Every patient transfer on an incident that the signed-in user may see vitals for, with its readings. The server
 * filters by who is asking and answers with an empty list for everyone else, so any incident screen can use this.
 */
export function useIncidentVitals(incidentId: number | null) {
  const queryKey = ["incident-vitals", incidentId];
  const topicsActive = incidentId != null;
  // New readings, and transfers being selected or moving along, arrive as payload-free nudges.
  useLiveInvalidation(topicsActive ? "/topic/vitals" : null, queryKey);
  useLiveInvalidation(topicsActive ? "/topic/hospital-transfers" : null, queryKey);

  return useQuery({
    queryKey,
    queryFn: () => apiFetch<IncidentTransferVitals[]>(`/api/hospital-transfers/incident/${incidentId}/vitals`),
    enabled: topicsActive,
  });
}

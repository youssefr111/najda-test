import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useLiveInvalidation } from "@/hooks/shared/useLiveInvalidation";
import type { HospitalTransfer } from "@/types/hospitalTransfer";

/** Every hospital transfer of one incident (dispatch and admin only), live. */
export function useIncidentTransfers(incidentId: number | null) {
  const queryKey = ["hospital-transfers", "incident", incidentId];
  useLiveInvalidation(incidentId != null ? "/topic/hospital-transfers" : null, queryKey);

  return useQuery({
    queryKey,
    queryFn: () => apiFetch<HospitalTransfer[]>(`/api/hospital-transfers/incident/${incidentId}`),
    enabled: incidentId != null,
    refetchInterval: 30_000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useLiveInvalidation } from "@/hooks/shared/useLiveInvalidation";
import type { VitalsUpdate } from "@/types/vitals";

export function useVitalsHistory(hospitalTransferId: number | null) {
  const queryKey = ["vitals", hospitalTransferId];
  // The backend already publishes each new reading on this topic.
  useLiveInvalidation(
    hospitalTransferId != null ? `/topic/hospital-transfers/${hospitalTransferId}/vitals` : null,
    queryKey,
  );

  return useQuery({
    queryKey,
    queryFn: () => apiFetch<VitalsUpdate[]>(`/api/hospital-transfers/${hospitalTransferId}/vitals`),
    enabled: hospitalTransferId != null,
    refetchInterval: 30_000,
  });
}

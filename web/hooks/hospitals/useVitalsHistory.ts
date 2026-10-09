import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { VitalsUpdate } from "@/types/vitals";

export function useVitalsHistory(hospitalTransferId: number | null) {
  return useQuery({
    queryKey: ["vitals", hospitalTransferId],
    queryFn: () => apiFetch<VitalsUpdate[]>(`/api/hospital-transfers/${hospitalTransferId}/vitals`),
    enabled: hospitalTransferId != null,
    refetchInterval: 5000,
  });
}
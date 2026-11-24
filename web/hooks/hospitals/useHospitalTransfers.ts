import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useLiveInvalidation } from "@/hooks/shared/useLiveInvalidation";
import type { HospitalTransfer } from "@/types/hospitalTransfer";

export function useHospitalTransfers(hospitalId: number | null) {
  // Live: a new incoming patient or a status change appears at once. The slow poll is only a safety net.
  useLiveInvalidation(hospitalId != null ? "/topic/hospital-transfers" : null, ["hospital-transfers"]);

  return useQuery({
    queryKey: ["hospital-transfers", hospitalId],
    queryFn: () => apiFetch<HospitalTransfer[]>(`/api/hospital-transfers?hospitalId=${hospitalId}`),
    enabled: hospitalId != null,
    refetchInterval: 30_000,
  });
}

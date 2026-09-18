import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { HospitalTransfer } from "@/types/hospitalTransfer";

export function useHospitalTransfers(hospitalId: number | null) {
  return useQuery({
    queryKey: ["hospital-transfers", hospitalId],
    queryFn: () => apiFetch<HospitalTransfer[]>(`/api/hospital-transfers?hospitalId=${hospitalId}`),
    enabled: hospitalId != null,
    refetchInterval: 5000,
  });
}
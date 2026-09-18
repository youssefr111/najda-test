import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { HospitalTransfer } from "@/types/hospitalTransfer";

export function useHospitalTransferForMission(missionId: number | null) {
  return useQuery({
    queryKey: ["hospital-transfer", "mission", missionId],
    queryFn: async () => (await apiFetch<HospitalTransfer | null>(`/api/hospital-transfers/mission/${missionId}`)) ?? null,
    enabled: missionId != null,
    refetchInterval: 5000,
  });
}
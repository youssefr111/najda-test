import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useLiveInvalidation } from "@/hooks/shared/useLiveInvalidation";
import type { HospitalTransfer } from "@/types/hospitalTransfer";

export function useHospitalTransferForMission(missionId: number | null) {
  const queryKey = ["hospital-transfer", "mission", missionId];
  useLiveInvalidation(missionId != null ? "/topic/hospital-transfers" : null, queryKey);

  return useQuery({
    queryKey,
    queryFn: async () => (await apiFetch<HospitalTransfer | null>(`/api/hospital-transfers/mission/${missionId}`)) ?? null,
    enabled: missionId != null,
    refetchInterval: 30_000,
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { HospitalTransfer } from "@/types/hospitalTransfer";

export function useSelectHospital() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { missionId: number; hospitalId?: number | null; destinationNameFreetext?: string | null }) =>
      apiFetch<HospitalTransfer>("/api/hospital-transfers/select", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["hospital-transfer", "mission", variables.missionId] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
    },
  });
}
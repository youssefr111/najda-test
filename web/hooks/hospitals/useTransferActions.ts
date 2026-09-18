import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { HospitalTransfer } from "@/types/hospitalTransfer";
import type { VitalsUpdate } from "@/types/vitals";

export function useMarkTransferEnRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hospitalTransferId: number) => apiFetch<HospitalTransfer>(`/api/hospital-transfers/${hospitalTransferId}/en-route`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hospital-transfer"] }),
  });
}

export function useMarkTransferArrived() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (hospitalTransferId: number) => apiFetch<HospitalTransfer>(`/api/hospital-transfers/${hospitalTransferId}/arrived`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospital-transfer"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}

export type SubmitVitalsPayload = {
  hospitalTransferId: number;
  heartRate?: number; bloodPressureSystolic?: number; bloodPressureDiastolic?: number;
  spo2?: number; respiratoryRate?: number; temperatureCelsius?: number;
  consciousnessLevel?: string; notes?: string;
};

export function useSubmitVitals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitVitalsPayload) => apiFetch<VitalsUpdate>("/api/hospital-transfers/vitals", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ["vitals", variables.hospitalTransferId] }),
  });
}
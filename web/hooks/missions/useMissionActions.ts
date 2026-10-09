import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Mission } from "@/types/mission";

function useMissionAction(action: "accept" | "en-route" | "arrived") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (missionId: number) => apiFetch<Mission>(`/api/missions/${missionId}/${action}`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missions"] }),
  });
}

export function useAcceptMission() { return useMissionAction("accept"); }
export function useMarkEnRoute() { return useMissionAction("en-route"); }
export function useMarkArrived() { return useMissionAction("arrived"); }

export function useRejectMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ missionId, reason }: { missionId: number; reason: string }) =>
      apiFetch<Mission>(`/api/missions/${missionId}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missions"] }),
  });
}
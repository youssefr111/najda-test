import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Mission } from "@/types/mission";

export function useWithdrawMission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (missionId: number) => apiFetch<Mission>(`/api/missions/${missionId}/withdraw`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });
}
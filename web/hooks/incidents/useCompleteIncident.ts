import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Incident } from "@/types/incident";

export function useCompleteIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (incidentId: number) => apiFetch<Incident>(`/api/incidents/${incidentId}/complete`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
    },
  });
}
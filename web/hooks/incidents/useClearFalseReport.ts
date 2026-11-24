import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Incident } from "@/types/incident";

export function useClearFalseReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (incidentId: number) =>
      apiFetch<Incident>(`/api/incidents/${incidentId}/false-report`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["caller-history"] });
      queryClient.invalidateQueries({ queryKey: ["caller-flags"] });
    },
  });
}
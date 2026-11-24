import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { CancellationCategory, Incident } from "@/types/incident";

interface CancelIncidentVariables {
  incidentId: number;
  category: CancellationCategory;
  details?: string;
}

export function useCancelIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, category, details }: CancelIncidentVariables) =>
      apiFetch<Incident>(`/api/incidents/${incidentId}/cancel`, { method: "POST", body: JSON.stringify({ category, details }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] }),
  });
}
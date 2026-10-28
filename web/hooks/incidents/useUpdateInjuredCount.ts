import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Incident } from "@/types/incident";

export function useUpdateInjuredCount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, injuredCount }: { incidentId: number; injuredCount: number }) =>
      apiFetch<Incident>(`/api/incidents/${incidentId}/injured-count`, { method: "PATCH", body: JSON.stringify({ injuredCount }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] }),
  });
}
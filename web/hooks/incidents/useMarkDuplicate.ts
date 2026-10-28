import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Incident } from "@/types/incident";

export function useMarkDuplicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, canonicalIncidentId }: { incidentId: number; canonicalIncidentId: number }) =>
      apiFetch<Incident>(`/api/incidents/${incidentId}/mark-duplicate`, { method: "POST", body: JSON.stringify({ canonicalIncidentId }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] }),
  });
}
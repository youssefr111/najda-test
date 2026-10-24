import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { FalseReportType, Incident } from "@/types/incident";

export function useMarkFalseReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ incidentId, type }: { incidentId: number; type: FalseReportType }) =>
      apiFetch<Incident>(`/api/incidents/${incidentId}/false-report`, { method: "POST", body: JSON.stringify({ type }) }),
    onSuccess: (_data, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["missions", "incident", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["caller-history"] });
      queryClient.invalidateQueries({ queryKey: ["caller-flags"] });
    },
  });
}
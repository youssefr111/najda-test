import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";

/** Lets a citizen withdraw a report that hasn't been assigned yet. */
export function useCancelIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (incidentId: number) => apiFetch<void>(`/api/incidents/${incidentId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] }),
  });
}

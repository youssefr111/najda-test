import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import type { Incident, SubmitIncidentRequest } from "@/types/incident";

export function useSubmitIncident() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitIncidentRequest) =>
      apiFetch<Incident>("/api/incidents", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents", "mine"] }),
  });
}

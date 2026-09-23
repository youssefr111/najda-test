import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export function useRetryAiPriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (incidentId: number) => apiFetch<{ message: string }>(`/api/incidents/${incidentId}/retry-ai-priority`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] }),
  });
}
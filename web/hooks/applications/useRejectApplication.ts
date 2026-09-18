import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { FirstResponderApplication } from "@/types/firstResponderApplication";

export function useRejectApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, reason }: { applicationId: number; reason: string }) =>
      apiFetch<FirstResponderApplication>(`/api/first-responder-applications/${applicationId}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}
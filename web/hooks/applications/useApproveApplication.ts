import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { FirstResponderApplication } from "@/types/firstResponderApplication";

export function useApproveApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: number) => apiFetch<FirstResponderApplication>(`/api/first-responder-applications/${applicationId}/approve`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}
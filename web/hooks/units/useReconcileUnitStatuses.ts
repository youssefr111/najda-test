import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export function useReconcileUnitStatuses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ message: string }>("/api/units/reconcile-statuses", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["units"] }),
  });
}
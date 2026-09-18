import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export function useBackfillAddresses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ message: string }>("/api/facilities/backfill-addresses", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["facilities"] }),
  });
}
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export function useForceEndShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (unitId: number) => apiFetch<{ message: string }>(`/api/shifts/admin-force-end/${unitId}`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["units"] }),
  });
}
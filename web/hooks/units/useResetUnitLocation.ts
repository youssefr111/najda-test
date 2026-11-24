import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { ResponseUnit } from "@/types/unit";

export function useResetUnitLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (unitId: number) => apiFetch<ResponseUnit>(`/api/units/${unitId}/location/reset`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["units"] }),
  });
}
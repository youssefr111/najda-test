import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { ResponseUnit, UnitType } from "@/types/unit";

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ unitId, payload }: { unitId: number; payload: { plateNumber: string; unitType: UnitType; facilityId: number | null } }) =>
      apiFetch<ResponseUnit>(`/api/units/${unitId}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["units"] }),
  });
}
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Facility, UpdateFacilityRequest } from "@/types/facility";

export function useUpdateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, payload }: { facilityId: number; payload: UpdateFacilityRequest }) =>
      apiFetch<Facility>(`/api/facilities/${facilityId}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["facilities"] }),
  });
}
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Facility, UpdateFacilityRequest } from "@/types/facility";
import type { FacilitiesPage } from "./useFacilitiesPage";

export function useUpdateFacility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, payload }: { facilityId: number; payload: UpdateFacilityRequest }) =>
      apiFetch<Facility>(`/api/facilities/${facilityId}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: (updated) => {
      // Patch the edited row in every cached list or page instead of downloading anything again.
      queryClient.setQueriesData<Facility[] | FacilitiesPage>({ queryKey: ["facilities"] }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) return old.map((facility) => (facility.id === updated.id ? updated : facility));
        return { ...old, content: old.content.map((facility) => (facility.id === updated.id ? updated : facility)) };
      });
      queryClient.invalidateQueries({ queryKey: ["facilities"], refetchType: "none" });
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { FacilityType, FacilityTypeChangeImpact } from "@/types/facility";

/**
 * What switching a facility to `type` would do to its staff and units. Pass null for either argument to stay idle.
 * The key deliberately sits outside ["facilities"]: useUpdateFacility patches every query under that prefix
 * as if it held facility rows.
 */
export function useFacilityTypeChangeImpact(facilityId: number | null, type: FacilityType | null) {
  return useQuery({
    queryKey: ["facility-type-impact", facilityId, type],
    queryFn: () => apiFetch<FacilityTypeChangeImpact>(`/api/facilities/${facilityId}/type-change-impact?type=${type}`),
    enabled: facilityId !== null && type !== null,
  });
}

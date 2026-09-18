import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Facility, FacilityType } from "@/types/facility";

export function useFacilities(types?: FacilityType | FacilityType[]) {
  const typeList = types ? (Array.isArray(types) ? types : [types]) : undefined;
  return useQuery({
    queryKey: ["facilities", typeList?.join(",") ?? "all"],
    queryFn: async () => {
      if (!typeList) return apiFetch<Facility[]>("/api/facilities");
      const results = await Promise.all(typeList.map((t) => apiFetch<Facility[]>(`/api/facilities?type=${t}`)));
      return results.flat();
    },
  });
}
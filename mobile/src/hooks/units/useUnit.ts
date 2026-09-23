import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import type { ResponseUnit } from "@/types/unit";

export function useUnit(unitId: number | null) {
  return useQuery({
    queryKey: ["units", unitId],
    queryFn: () => apiFetch<ResponseUnit>(`/api/units/${unitId}`),
    enabled: unitId != null,
    refetchInterval: 15_000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { ShiftAssignmentResponse } from "@/types/shift";

export function useCrewForUnit(unitId: number | null) {
  return useQuery({
    queryKey: ["shifts", "unit", unitId],
    queryFn: () => apiFetch<ShiftAssignmentResponse[]>(`/api/shifts/unit/${unitId}/crew`),
    enabled: unitId != null,
    refetchInterval: 15000,
  });
}
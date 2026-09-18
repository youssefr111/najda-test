import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { ShiftAssignmentResponse } from "@/types/shift";

export function useMyShift() {
  return useQuery({
    queryKey: ["shifts", "me"],
    queryFn: async () => (await apiFetch<ShiftAssignmentResponse | null>("/api/shifts/me")) ?? null,
    refetchInterval: 10000,
  });
}
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { ResponseUnit } from "@/types/unit";

export function useMyFacilityUnits() {
  return useQuery({
    queryKey: ["units", "mine"],
    queryFn: () => apiFetch<ResponseUnit[]>("/api/units/mine"),
  });
}
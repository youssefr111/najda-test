import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/api/client";
import type { ResponseUnit } from "@/types/unit";

/** Units at the signed-in responder's own facility -- the pool they can start/join a shift on. */
export function useMyFacilityUnits() {
  return useQuery({
    queryKey: ["units", "mine"],
    queryFn: () => apiFetch<ResponseUnit[]>("/api/units/mine"),
  });
}

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useLiveInvalidation } from "@/hooks/shared/useLiveInvalidation";
import type { ResponseUnit } from "@/types/unit";

export function useAvailableUnits() {
  useLiveInvalidation("/topic/units", ["units"]);

  return useQuery({
    queryKey: ["units"],
    queryFn: () => apiFetch<ResponseUnit[]>("/api/units"),
  });
}

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { CallerHistory } from "@/types/incident";

export function useCallerHistory(incidentId: number) {
  return useQuery({
    queryKey: ["caller-history", incidentId],
    queryFn: () => apiFetch<CallerHistory>(`/api/incidents/${incidentId}/caller-history`),
    staleTime: 60_000,
  });
}
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Incident } from "@/types/incident";

export function useAllIncidents() {
  return useQuery({
    queryKey: ["incidents", "all"],
    queryFn: () => apiFetch<Incident[]>("/api/incidents/all"),
    refetchInterval: 10000,
  });
}
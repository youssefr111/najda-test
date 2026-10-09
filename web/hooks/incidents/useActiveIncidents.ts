import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Incident } from "@/types/incident";

export function useActiveIncidents() {
  return useQuery({
    queryKey: ["incidents", "active"],
    queryFn: () => apiFetch<Incident[]>("/api/incidents/active"),
    refetchInterval: 5000,
  });
}
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { Incident } from "@/types/incident";

export function useMyIncidents() {
  return useQuery({
    queryKey: ["incidents", "mine"],
    queryFn: () => apiFetch<Incident[]>("/api/incidents/mine"),
    staleTime: 15_000,
  });
}
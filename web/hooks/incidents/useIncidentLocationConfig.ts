import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { IncidentLocationConfig } from "@/types/incident";

/** The backend's location rules: whether a manual pin is allowed, how far it may stray, and Egypt's outline. */
export function useIncidentLocationConfig() {
  return useQuery({
    queryKey: ["config", "incident-location"],
    queryFn: () => apiFetch<IncidentLocationConfig>("/api/config/incident-location"),
    staleTime: 5 * 60_000,
  });
}
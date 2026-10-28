import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useLiveInvalidation } from "@/hooks/shared/useLiveInvalidation";
import type { Incident } from "@/types/incident";

export function useIncidentQueue() {
  // Every incident query shares the ["incidents"] prefix, so one live subscription refreshes them all.
  useLiveInvalidation("/topic/incidents", ["incidents"]);

  return useQuery({
    queryKey: ["incidents", "queue"],
    queryFn: () => apiFetch<Incident[]>("/api/incidents/queue"),
  });
}

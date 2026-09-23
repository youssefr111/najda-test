import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { createWsClient } from "@/lib/ws/client";
import type { Incident } from "@/types/incident";

export function useIncidentQueue() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const client = createWsClient();
    client.onConnect = () => {
      client.subscribe("/topic/incidents", () => {
        queryClient.invalidateQueries({ queryKey: ["incidents"] });
      });
    };
    client.activate();
    return () => { client.deactivate(); };
  }, [queryClient]);

  return useQuery({
    queryKey: ["incidents", "queue"],
    queryFn: () => apiFetch<Incident[]>("/api/incidents/queue"),
  });
}
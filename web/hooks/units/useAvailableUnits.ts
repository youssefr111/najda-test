import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { createWsClient } from "@/lib/ws/client";
import type { ResponseUnit } from "@/types/unit";

export function useAvailableUnits() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const client = createWsClient();
    client.onConnect = () => {
      client.subscribe("/topic/units", () => {
        queryClient.invalidateQueries({ queryKey: ["units"] });
      });
    };
    client.activate();
    return () => { client.deactivate(); };
  }, [queryClient]);

  return useQuery({
    queryKey: ["units"],
    queryFn: () => apiFetch<ResponseUnit[]>("/api/units"),
  });
}
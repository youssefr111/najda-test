import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { createWsClient } from "@/lib/ws/client";
import type { ChatMessage } from "@/types/chat";

export function useIncidentChat(incidentId: number | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (incidentId == null) return;
    const client = createWsClient();
    client.onConnect = () => {
      client.subscribe(`/topic/incidents/${incidentId}/chat`, (frame) => {
        const newMessage: ChatMessage = JSON.parse(frame.body);
        queryClient.setQueryData<ChatMessage[]>(["chat", incidentId], (old) =>
          old ? [...old, newMessage] : [newMessage]
        );
      });
    };
    client.activate();
    return () => { client.deactivate(); };
  }, [incidentId, queryClient]);

  return useQuery({
    queryKey: ["chat", incidentId],
    queryFn: () => apiFetch<ChatMessage[]>(`/api/incidents/${incidentId}/chat`),
    enabled: incidentId != null,
  });
}
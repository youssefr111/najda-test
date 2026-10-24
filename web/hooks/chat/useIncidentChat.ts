import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { stompHub } from "@/lib/ws/hub";
import type { ChatMessage } from "@/types/chat";

export function useIncidentChat(incidentId: number | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (incidentId == null) return;

    const stopTopic = stompHub.subscribe(`/topic/incidents/${incidentId}/chat`, (frame) => {
      const newMessage: ChatMessage = JSON.parse(frame.body);
      queryClient.setQueryData<ChatMessage[]>(["chat", incidentId], (old) => {
        if (!old) return [newMessage];
        // A refetch and the live message can both carry it: never show it twice.
        return old.some((message) => message.id === newMessage.id) ? old : [...old, newMessage];
      });
    });
    // Messages sent while the connection was down are fetched again once it is back.
    const stopCatchUp = stompHub.onReconnect(() => queryClient.invalidateQueries({ queryKey: ["chat", incidentId] }));

    return () => {
      stopTopic();
      stopCatchUp();
    };
  }, [incidentId, queryClient]);

  return useQuery({
    queryKey: ["chat", incidentId],
    queryFn: () => apiFetch<ChatMessage[]>(`/api/incidents/${incidentId}/chat`),
    enabled: incidentId != null,
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { ChatMessage } from "@/types/chat";

export function useSendChatMessage(incidentId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      apiFetch<ChatMessage>(`/api/incidents/${incidentId}/chat`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat", incidentId] }),
  });
}
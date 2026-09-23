import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { IncidentMedia } from "@/types/incident";

export function useEditIncidentMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mediaId, textContent }: { mediaId: number; textContent: string }) =>
      apiFetch<IncidentMedia>(`/api/incident-media/${mediaId}`, {
        method: "PATCH",
        body: JSON.stringify({ newContent: textContent }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["incidents"] }),
  });
}
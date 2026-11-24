import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export function useDeleteApplicationDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: number) => apiFetch<void>(`/api/first-responder-applications/documents/${documentId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}
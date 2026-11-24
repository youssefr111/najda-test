import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export function useApplicationDocumentUrl(documentId: number | null) {
  return useQuery({
    queryKey: ["application-document-url", documentId],
    queryFn: () => apiFetch<{ downloadUrl: string }>(`/api/first-responder-applications/documents/${documentId}/download-url`),
    enabled: documentId != null,
    staleTime: 4 * 60 * 1000,
  });
}
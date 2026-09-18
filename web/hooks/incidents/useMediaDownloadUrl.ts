import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export function useMediaDownloadUrl(mediaId: number | null) {
  return useQuery({
    queryKey: ["media-download-url", mediaId],
    queryFn: () => apiFetch<{ downloadUrl: string }>(`/api/incident-media/${mediaId}/download-url`),
    enabled: mediaId != null,
    staleTime: 4 * 60 * 1000, // signed URLs expire in 5 min -- refetch just before that, not on every render
  });
}
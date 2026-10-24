import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { uploadToSignedUrl } from "@/lib/supabase/directUpload";
import type { IncidentMedia, MediaType } from "@/types/incident";

function guessExtension(file: File | Blob): string {
  const name = (file as File).name;
  if (name && name.includes(".")) return name.split(".").pop()!.toLowerCase();
  const subtype = file.type?.split("/")[1]?.split(";")[0];
  return subtype || "bin";
}

export function useAttachIncidentMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      incidentId, mediaType, file,
    }: { incidentId: number; mediaType: Exclude<MediaType, "TEXT">; file: File | Blob }) => {
      const params = new URLSearchParams({ incidentId: String(incidentId), fileExtension: guessExtension(file) });

      const signed = await apiFetch<{ uploadUrl: string; path: string }>(
        `/api/incident-media/upload-url?${params.toString()}`,
        { method: "POST" }
      );

      await uploadToSignedUrl(signed.uploadUrl, file, file.type);

      return apiFetch<IncidentMedia>("/api/incident-media", {
        method: "POST",
        body: JSON.stringify({ incidentId, mediaType, path: signed.path }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
  });
}
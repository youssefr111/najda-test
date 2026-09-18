import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { uploadToSignedUrl } from "@/lib/supabase/directUpload";
import type { FirstResponderApplication } from "@/types/firstResponderApplication";

function guessExtension(file: File): string {
  return file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
}

export function useUploadApplicationDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ applicationId, file }: { applicationId: number; file: File }) => {
      const params = new URLSearchParams({ applicationId: String(applicationId), fileExtension: guessExtension(file) });
      const signed = await apiFetch<{ uploadUrl: string; path: string }>(`/api/first-responder-applications/upload-url?${params.toString()}`, { method: "POST" });
      await uploadToSignedUrl(signed.uploadUrl, file, file.type);
      return apiFetch<FirstResponderApplication>("/api/first-responder-applications/documents", {
        method: "POST",
        body: JSON.stringify({ applicationId, path: signed.path, originalFileName: file.name }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });
}
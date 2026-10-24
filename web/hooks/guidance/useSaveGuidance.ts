import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { GuidanceDocument, UpdateGuidanceRequest } from "@/types/guidance";
import { GUIDANCE_QUERY_KEY } from "./useGuidance";

export function useSaveGuidance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateGuidanceRequest) =>
      apiFetch<GuidanceDocument>("/api/guidance", { method: "PUT", body: JSON.stringify(payload) }),
    onSuccess: (saved) => queryClient.setQueryData(GUIDANCE_QUERY_KEY, saved),
  });
}

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { GuidanceDocument } from "@/types/guidance";

export const GUIDANCE_QUERY_KEY = ["guidance"] as const;

const FIVE_MINUTES = 5 * 60 * 1000;

interface UseGuidanceOptions {
  /** The admin editor always wants the latest version; citizens can rely on a short cache. */
  fresh?: boolean;
}

export function useGuidance({ fresh = false }: UseGuidanceOptions = {}) {
  return useQuery({
    queryKey: GUIDANCE_QUERY_KEY,
    queryFn: () => apiFetch<GuidanceDocument>("/api/guidance"),
    staleTime: fresh ? 0 : FIVE_MINUTES,
  });
}

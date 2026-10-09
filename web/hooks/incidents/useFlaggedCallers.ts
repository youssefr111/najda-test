import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { FlaggedCaller } from "@/types/incident";

export function useFlaggedCallers() {
  return useQuery({
    queryKey: ["caller-flags"],
    queryFn: () => apiFetch<FlaggedCaller[]>("/api/admin/caller-flags"),
    staleTime: 60_000,
  });
}
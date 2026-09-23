import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { FirstResponderApplication } from "@/types/firstResponderApplication";

export function useMyApplications() {
  return useQuery({ queryKey: ["applications", "mine"], queryFn: () => apiFetch<FirstResponderApplication[]>("/api/first-responder-applications/mine") });
}
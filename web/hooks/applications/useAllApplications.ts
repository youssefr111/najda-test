import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { FirstResponderApplication } from "@/types/firstResponderApplication";

export function useAllApplications() {
  return useQuery({ queryKey: ["applications", "all"], queryFn: () => apiFetch<FirstResponderApplication[]>("/api/first-responder-applications") });
}
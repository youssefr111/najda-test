import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { CallerContact } from "@/types/incident";

/** The caller's verified phone number, for dispatchers and admins only (the server refuses everyone else). */
export function useCallerContact(incidentId: number) {
  return useQuery({
    queryKey: ["caller-contact", incidentId],
    queryFn: () => apiFetch<CallerContact>(`/api/incidents/${incidentId}/caller-contact`),
    staleTime: 60_000,
    retry: false,
  });
}
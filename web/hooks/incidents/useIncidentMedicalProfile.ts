import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { IncidentMedicalProfile } from "@/types/medicalProfile";

/**
 * The patient's medical profile for an incident, for the people treating them.
 * Every successful fetch is an audited read on the server, so this deliberately
 * never refetches behind the viewer's back, and a 403 isn't retried.
 */
export function useIncidentMedicalProfile(incidentId: number) {
  return useQuery({
    // Own root key so broad ["incidents"] invalidations don't trigger extra audited reads.
    queryKey: ["incident-medical-profile", incidentId],
    queryFn: () => apiFetch<IncidentMedicalProfile>(`/api/incidents/${incidentId}/medical-profile`),
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
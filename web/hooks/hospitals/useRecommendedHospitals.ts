import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export interface HospitalCandidate { id: number; name: string; distanceKm: number; recommended: boolean; }

export function useRecommendedHospitals(missionId: number | null) {
  return useQuery({
    queryKey: ["hospital-transfers", "recommended", missionId],
    queryFn: () => apiFetch<HospitalCandidate[]>(`/api/hospital-transfers/recommended/${missionId}`),
    enabled: missionId != null,
  });
}
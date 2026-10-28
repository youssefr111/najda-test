import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { MedicalProfile } from "@/types/medicalProfile";

export const MEDICAL_PROFILE_QUERY_KEY = ["medical-profile"] as const;

export function useMedicalProfile() {
  return useQuery({
    queryKey: MEDICAL_PROFILE_QUERY_KEY,
    queryFn: () => apiFetch<MedicalProfile>("/api/users/me/medical-profile"),
  });
}
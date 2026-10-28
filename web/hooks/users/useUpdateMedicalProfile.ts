import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { MedicalProfile, UpdateMedicalProfileRequest } from "@/types/medicalProfile";
import { MEDICAL_PROFILE_QUERY_KEY } from "./useMedicalProfile";

export function useUpdateMedicalProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMedicalProfileRequest) =>
      apiFetch<MedicalProfile>("/api/users/me/medical-profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: (updated) => queryClient.setQueryData(MEDICAL_PROFILE_QUERY_KEY, updated),
  });
}
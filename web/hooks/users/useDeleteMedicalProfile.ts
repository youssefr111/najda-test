import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { EMPTY_MEDICAL_PROFILE } from "@/types/medicalProfile";
import { MEDICAL_PROFILE_QUERY_KEY } from "./useMedicalProfile";

export function useDeleteMedicalProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiFetch<void>("/api/users/me/medical-profile", { method: "DELETE" }),
    onSuccess: () => queryClient.setQueryData(MEDICAL_PROFILE_QUERY_KEY, EMPTY_MEDICAL_PROFILE),
  });
}
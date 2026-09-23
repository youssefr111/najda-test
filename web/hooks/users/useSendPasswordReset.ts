import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export function useSendPasswordReset() {
  return useMutation({
    mutationFn: (userId: number) =>
      apiFetch<{ passwordResetLink: string }>(`/api/users/${userId}/password-reset-link`, { method: "POST" }),
  });
}
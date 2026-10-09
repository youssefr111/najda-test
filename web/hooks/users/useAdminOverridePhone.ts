import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { User } from "@/types/user";

export function useAdminOverridePhone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, phone }: { userId: number; phone: string }) =>
      apiFetch<User>(`/api/users/${userId}/admin-override-phone`, {
        method: "POST",
        body: JSON.stringify({ phone }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
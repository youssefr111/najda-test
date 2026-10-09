import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import type { User } from "@/types/user";

export function useAdminOverrideEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, email }: { userId: number; email: string }) =>
      apiFetch<User>(`/api/users/${userId}/admin-override-email`, {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}